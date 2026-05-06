import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODEL = 'claude-haiku-4-5';
const MAX_LISTING_TEXT = 12000; // chars sent to Claude from full listing

// ── Fetch listing text server-side (same bot-bypass as extract-listing) ──────
const BOT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'lt,en-US;q=0.7,en;q=0.3',
  'Cache-Control': 'no-cache',
};

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ').trim();
}

async function fetchListingText(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: BOT_HEADERS,
      signal: AbortSignal.timeout(9000),
      redirect: 'follow',
    });
    if (!r.ok) return null;
    const html = await r.text();
    if (html.includes('cf-challenge') || html.includes('Just a moment') || html.length < 2000) return null;
    return htmlToText(html).slice(0, MAX_LISTING_TEXT);
  } catch {
    return null;
  }
}

// ── LKS94 projection (reused from geo-proxy) ────────────────────────────────
function lks94(lng: number, lat: number): [number, number] {
  const a = 6378137.0, f = 1 / 298.257222101;
  const k0 = 0.9998, lon0 = 24 * Math.PI / 180;
  const FE = 500000, FN = 0;
  const e2 = 2 * f - f * f;
  const n = f / (2 - f);
  const A = a / (1 + n) * (1 + n * n / 4 + n * n * n * n / 64);
  const phi = lat * Math.PI / 180;
  const lam = lng * Math.PI / 180;
  const xi = Math.atanh(Math.sin(phi)) - Math.sqrt(e2) * Math.atanh(Math.sqrt(e2) * Math.sin(phi));
  const eta = lam - lon0;
  const alpha = [n / 2 - 2 * n * n / 3 + 5 * n * n * n / 16, 13 * n * n / 48 - 3 * n * n * n / 5, 61 * n * n * n / 240];
  let xiP = xi, etaP = eta;
  for (let j = 1; j <= 3; j++) {
    xiP += alpha[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    etaP += alpha[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }
  return [FE + k0 * A * etaP, FN + k0 * A * xiP];
}

// ── Apskritis lookup from lat/lng ────────────────────────────────────────────
const APSKRITYS = [
  { label: 'Alytaus',       lat: 54.40, lng: 24.05 },
  { label: 'Kauno',         lat: 54.90, lng: 23.95 },
  { label: 'Klaipėdos',     lat: 55.71, lng: 21.14 },
  { label: 'Marijampolės',  lat: 54.56, lng: 23.36 },
  { label: 'Panevėžio',     lat: 55.73, lng: 24.36 },
  { label: 'Šiaulių',       lat: 55.93, lng: 23.31 },
  { label: 'Tauragės',      lat: 55.25, lng: 22.29 },
  { label: 'Telšių',        lat: 55.98, lng: 22.23 },
  { label: 'Utenos',        lat: 55.50, lng: 25.60 },
  { label: 'Vilniaus',      lat: 54.68, lng: 25.28 },
];

function getApskritis(lat: number, lng: number): string {
  let best = APSKRITYS[0], bestDist = Infinity;
  for (const a of APSKRITYS) {
    const d = (lat - a.lat) ** 2 + ((lng - a.lng) * 0.6) ** 2;
    if (d < bestDist) { bestDist = d; best = a; }
  }
  return best.label;
}

// ── Geoportal MVZ (mass valuation zones) ────────────────────────────────────
// NŽT publishes land mass valuation zones on Geoportal as MapServer service.
// Returns estimated land value in €/ha for the point, or null if unavailable.
async function fetchMvz(lat: number, lng: number): Promise<{ eurHa: number | null; zona: string | null }> {
  try {
    const [x, y] = lks94(lng, lat);
    const EXT = 500;
    const params = new URLSearchParams({
      f: 'json',
      geometry: JSON.stringify({ x, y }),
      geometryType: 'esriGeometryPoint',
      sr: '3346', layers: 'all', tolerance: '5',
      returnGeometry: 'false', returnFieldName: 'true',
      mapExtent: `${x - EXT},${y - EXT},${x + EXT},${y + EXT}`,
      imageDisplay: '800,800,96',
    });
    const res = await fetch(`https://www.geoportal.lt/mapproxy/nzt_mvz/MapServer/identify?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { eurHa: null, zona: null };
    const d = await res.json() as { results?: any[] };
    const r = d.results?.[0];
    if (!r) return { eurHa: null, zona: null };
    const attrs = r.attributes ?? {};
    // Field names vary — try common ones
    const eurHa = attrs['EUR_HA'] ?? attrs['VERT_EUR_HA'] ?? attrs['KAINA_HA'] ?? attrs['VERTE'] ?? null;
    const zona = attrs['ZONA_KOD'] ?? attrs['ZONA'] ?? attrs['PAVADINIMAS'] ?? null;
    return { eurHa: eurHa ? Number(eurHa) : null, zona: zona ? String(zona) : null };
  } catch {
    return { eurHa: null, zona: null };
  }
}

// ── RC sandoriai via data.gov.lt CKAN ───────────────────────────────────────
// RC publishes NT transaction data quarterly. We query it via CKAN API.
// Falls back gracefully if API changes or data is unavailable.
interface RcSandoris {
  adresas: string;
  kaina: number;
  plotas: string;
  data: string;
}

async function fetchRcSandoriai(apskritis: string): Promise<RcSandoris[]> {
  try {
    // RC NT sandorių registras on data.gov.lt
    // Query last 2 years, same apskritis, type = house/homestead/land
    const sql = `
      SELECT "Objekto adresas", "Sandorio suma", "Plotas", "Sandorio data", "Objekto paskirtis"
      FROM "bef7e990-0bf6-4bca-a14f-ca5efcd8df84"
      WHERE "Apskritis" ILIKE '%${apskritis.replace("'", "")}%'
        AND "Sandorio data" >= '2022-01-01'
        AND ("Objekto paskirtis" ILIKE '%gyvenam%' OR "Objekto paskirtis" ILIKE '%sodyb%' OR "Objekto paskirtis" ILIKE '%žem%')
        AND "Sandorio suma" > 5000
      ORDER BY "Sandorio data" DESC
      LIMIT 8
    `.trim().replace(/\s+/g, ' ');

    const res = await fetch(
      `https://data.gov.lt/api/3/action/datastore_search_sql?sql=${encodeURIComponent(sql)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const json = await res.json() as any;
    const records = json?.result?.records ?? [];
    return records.map((r: any) => ({
      adresas: r['Objekto adresas'] ?? '',
      kaina: Number(r['Sandorio suma'] ?? 0),
      plotas: r['Plotas'] ?? '',
      data: (r['Sandorio data'] ?? '').slice(0, 10),
    })).filter((s: RcSandoris) => s.kaina > 0);
  } catch {
    return [];
  }
}

// ── Claude valuation ─────────────────────────────────────────────────────────
interface ValuationInput {
  lat: number;
  lng: number;
  apskritis: string;
  zonaPavadinimas?: string;
  kaina?: number;
  plotas_namas?: number;
  plotas_sklypas?: string;
  statybos_metai?: number;
  atributai: string[];
  mvz: { eurHa: number | null; zona: string | null };
  sandoriai: RcSandoris[];
  salis?: string;
  listingText?: string | null;  // full scraped text or komentaras fallback
  apsaugos?: string[];          // natura2000, saugoma_terit, vanduo_apsauga
}

function buildPrompt(inp: ValuationInput): string {
  const vieta = [
    inp.zonaPavadinimas && `Vietovė: ${inp.zonaPavadinimas}`,
    `Apskritis: ${inp.apskritis}`,
  ].filter(Boolean).join(', ');

  const specs = [
    inp.plotas_namas   && `Namas: ${inp.plotas_namas} m²`,
    inp.plotas_sklypas && `Sklypas: ${inp.plotas_sklypas}`,
    inp.statybos_metai && `Statybos metai: ${inp.statybos_metai}`,
  ].filter(Boolean).join(' · ');

  const attrMap: Record<string, string> = {
    upelis: 'upelis/upė', tvenkinys: 'tvenkinys/ežeras',
    sodas: 'sodas/daržas', medziai: 'medžiai/miškelis',
    prie_juros: 'prie jūros', gamtoje: 'gamtoje', baseinas: 'baseinas', kaimas: 'kaimas',
  };
  const attrLabel = inp.atributai.map(a => attrMap[a] ?? a).join(', ') || '—';

  const apsaugosMap: Record<string, string> = {
    natura2000:    'Natura 2000 zona (riboja statybas)',
    saugoma_terit: 'Saugoma teritorija (riboja statybas)',
    vanduo_apsauga:'Vandens apsaugos zona (riboja statybas)',
  };
  const apsaugosLabel = (inp.apsaugos ?? []).map(a => apsaugosMap[a] ?? a);

  const mvzLine = inp.mvz.eurHa
    ? `Oficiali žemės MVZ zona: ~${Math.round(inp.mvz.eurHa).toLocaleString()} €/ha${inp.mvz.zona ? ` (zona ${inp.mvz.zona})` : ''}`
    : null;

  const sandoriaiLines = inp.sandoriai.length > 0
    ? inp.sandoriai.map(s =>
        `  • ${s.adresas || apskritis_short(inp.apskritis)}: ${s.kaina.toLocaleString()} €, plotas ${s.plotas || '?'}, data ${s.data}`
      ).join('\n')
    : null;

  const foreignNote = inp.salis && inp.salis !== 'lt'
    ? `\nPROPERTY IS ABROAD (${inp.salis.toUpperCase()}) — evaluate using that country's rural market.`
    : '';

  const listingSection = inp.listingText
    ? `\nSKELBIMO TEKSTAS (pilnas):\n${inp.listingText}\n`
    : '';

  return `Tu esi NT rinkos vertintojas. Įvertink šį nekilnojamąjį turtą ir grąžink TIKTAI JSON, be jokio papildomo teksto.${foreignNote}

TURTO DUOMENYS:
Vieta: ${vieta}
Charakteristikos: ${specs || '(nenurodyta)'}
Ypatybės: ${attrLabel}
${apsaugosLabel.length > 0 ? `Apsaugos zonos: ${apsaugosLabel.join(', ')}\n` : ''}Skelbimo kaina: ${inp.kaina ? `${inp.kaina.toLocaleString()} €` : '(nenurodyta)'}
${mvzLine ? mvzLine + '\n' : ''}${sandoriaiLines ? `Panašūs sandoriai regione:\n${sandoriaiLines}\n` : ''}${listingSection}
Grąžink JSON (tik JSON, be markdown):
{
  "vertinimasEur": <skaičius — rinkos vertės vidurkis €, null jei neįmanoma įvertinti>,
  "diapazonasMin": <minimali tikėtina vertė €>,
  "diapazonasMax": <maksimali tikėtina vertė €>,
  "palyginimas": "brangu" | "teisinga" | "pigi" | "nežinoma",
  "procentas": <kiek % skelbimo kaina viršija/nusileidžia rinkos vertę — teigiamas=brangu, null jei kaina nežinoma>,
  "veiksniai": ["+ Vanduo prie sklypo +8%", "- Senas pastatas (1975) -12%", ...],
  "komentaras": "<2–3 sakiniai: rinkos situacija, patarimas>",
  "confidence": "high" | "medium" | "low"
}

Taisyklės:
- Lietuvos kaimo NT: sodybos paprastai 30 000–250 000 €, sklypai be namo 5 000–50 000 €
- Vanduo prie sklypo paprastai prideda 10–20% vertės
- Miškelis/medžiai paprastai +5–15%
- Vilniaus/Kauno rajonai brangiausi, periferija pigesnė
- Natura 2000 / saugoma teritorija riboja statybas — paprastai mažina rinkos vertę 10–25%, bet gali kelti gamtinę vertę
- Vandens apsaugos zona riboja statybas šalia vandens — gali mažinti 5–15%
- confidence=high tik jei yra sandorių duomenų arba MVZ; medium jei tik vietovė žinoma; low jei labai mažai info
- Jei kaina nežinoma, procentas=null, palyginimas="nežinoma"`;
}

function apskritis_short(a: string) {
  return a.replace('aus', '.').replace('ės', '.').replace('io', '.');
}

async function callClaude(apiKey: string, prompt: string) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Error(`Claude: ${await r.text()}`);
  const data = await r.json() as any;
  const raw = data.content?.[0]?.text ?? '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('JSON not found in response');
  return JSON.parse(match[0]);
}

// ── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-App-Secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const appSecret = process.env.APP_SECRET;
  if (appSecret && req.headers['x-app-secret'] !== appSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const { lat, lng, kaina, plotas_namas, plotas_sklypas, statybos_metai,
          atributai = [], zonaPavadinimas, salis, url, komentaras, apsaugos = [] } = req.body as any;

  if (!lat || !lng) return res.status(400).json({ error: 'lat/lng required' });

  const apskritis = getApskritis(lat, lng);

  // Fire MVZ, RC, and listing fetch in parallel — all with graceful fallback
  const [mvzResult, sandoriaiResult, listingResult] = await Promise.allSettled([
    fetchMvz(lat, lng),
    fetchRcSandoriai(apskritis),
    url ? fetchListingText(url) : Promise.resolve(null),
  ]);

  const mvz = mvzResult.status === 'fulfilled' ? mvzResult.value : { eurHa: null, zona: null };
  const sandoriai = sandoriaiResult.status === 'fulfilled' ? sandoriaiResult.value : [];
  // Use full listing text if scraped successfully, otherwise fall back to komentaras
  const listingText = (listingResult.status === 'fulfilled' && listingResult.value)
    ? listingResult.value
    : (komentaras || null);

  try {
    const prompt = buildPrompt({
      lat, lng, apskritis, zonaPavadinimas, kaina, plotas_namas,
      plotas_sklypas, statybos_metai, atributai, mvz, sandoriai, salis, listingText, apsaugos,
    });
    const result = await callClaude(apiKey, prompt);

    return res.json({
      ok: true,
      ...result,
      sandoriai,                   // pass through for UI display
      mvzEurHa: mvz.eurHa,
      apskritis,
      dataSources: {
        mvz: mvz.eurHa !== null,
        rc: sandoriai.length > 0,
        claude: true,
        fullText: listingResult.status === 'fulfilled' && !!listingResult.value,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
