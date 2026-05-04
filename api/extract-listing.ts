import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODEL = 'claude-haiku-4-5';
const MAX_TEXT = 18000;

// Browser-like headers to bypass basic bot detection
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'lt,en-US;q=0.7,en;q=0.3',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
};

// Lithuanian bbox: lat 53.8–56.5, lng 20.9–26.9
const LAT_RE  = /5[3456]\.\d{4,}/g;
const LNG_RE  = /2[0-6]\.\d{4,}/g;

/**
 * Scans full HTML for GPS coordinates in multiple formats:
 * 1. URL params:  lat=54.1234&lng=25.1234  (Google Maps, DP Market links)
 * 2. JSON/JS:     "lat":54.1234, "lng":25.1234
 * 3. Bare pairs:  most frequent LT lat/lng numbers in script blocks
 */
function extractCoordsFromHtml(html: string): string {
  // 1. URL query params (most reliable — Google Maps / DP Market links)
  const urlParamRe = /\blat=(5[3456]\.\d{4,})(?:[^]*?(?:&(?:amp;)?|\?))?lng=(2[0-6]\.\d{4,})/i;
  const urlMatch = urlParamRe.exec(html);
  if (urlMatch) {
    return `[GPS koordinatės rastos URL parametruose: lat=${urlMatch[1]}, lng=${urlMatch[2]}]\n`;
  }

  // Also try lng before lat order
  const urlMatchRev = /\blng=(2[0-6]\.\d{4,})(?:[^]*?(?:&(?:amp;)?|\?))?lat=(5[3456]\.\d{4,})/i.exec(html);
  if (urlMatchRev) {
    return `[GPS koordinatės rastos URL parametruose: lat=${urlMatchRev[2]}, lng=${urlMatchRev[1]}]\n`;
  }

  // 2. JSON / JS variable patterns: "lat":54.xxx or lat:54.xxx or "latitude":54.xxx
  const scriptBlocks: string[] = [];
  const scriptRe = /<script[\s\S]*?>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html)) !== null) scriptBlocks.push(m[1]);

  const jsonCoordRe = /["']?(?:lat(?:itude)?|y)["']?\s*[:=]\s*(5[3456]\.\d{4,})[\s\S]{0,80}?["']?(?:l(?:ng|on)(?:gitude)?|x)["']?\s*[:=]\s*(2[0-6]\.\d{4,})/i;
  for (const block of scriptBlocks) {
    const match = jsonCoordRe.exec(block);
    if (match) {
      return `[GPS koordinatės rastos JS kode: lat=${match[1]}, lng=${match[2]}]\n`;
    }
  }

  // 3. Fallback: most frequent LT coordinate pair in all script content
  const allScript = scriptBlocks.join(' ');
  const lats = [...allScript.matchAll(LAT_RE)].map(x => x[0]);
  const lngs = [...allScript.matchAll(LNG_RE)].map(x => x[0]);
  if (lats.length && lngs.length) {
    return `[GPS koordinatės rastos JS kode: lat=${mode(lats)}, lng=${mode(lngs)}]\n`;
  }

  return '';
}

function mode(arr: string[]): string {
  const freq: Record<string, number> = {};
  arr.forEach(v => { freq[v] = (freq[v] ?? 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

function resolveUrl(src: string, base?: string): string {
  if (!base || src.startsWith('http') || src.startsWith('//')) return src;
  try { return new URL(src, base).href; } catch { return src; }
}

/** Tries og:image → twitter:image → first real <img> src (resolved to absolute). */
function extractOgImage(html: string, base?: string): string | null {
  // 1. og:image meta
  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  if (og) return resolveUrl(og, base);

  // 2. twitter:image meta
  const tw =
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)?.[1];
  if (tw) return resolveUrl(tw, base);

  // 3. First <img> that looks like a real photo (not logo/icon/pixel/sprite)
  const SKIP = /logo|icon|avatar|pixel|1x1|sprite|track|banner|button|arrow|blank/i;
  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const src = m[1];
    if (SKIP.test(src)) continue;
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(src) && !src.includes('/photos/') && !src.includes('/images/') && !src.includes('/img/')) continue;
    return resolveUrl(src, base);
  }

  return null;
}

/** Strips HTML tags and collapses whitespace, but preserves coord hint at top */
function htmlToText(html: string): string {
  const coordHint = extractCoordsFromHtml(html);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return coordHint + text;
}

/** Try to fetch URL server-side. Returns text or null on failure. */
async function fetchUrl(url: string): Promise<{ text: string; nuotrauka: string | null } | { blocked: true }> {
  try {
    const r = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    if (!r.ok) return { blocked: true };

    const html = await r.text();

    // Detect Cloudflare / bot challenge pages
    if (
      html.includes('cf-challenge') ||
      html.includes('_cf_chl') ||
      html.includes('Just a moment') ||
      html.includes('Ray ID') ||
      html.length < 2000
    ) {
      return { blocked: true };
    }

    return { text: htmlToText(html), nuotrauka: extractOgImage(html, url) };
  } catch {
    return { blocked: true };
  }
}

const SYSTEM = `Tu esi NT skelbimų duomenų ekstraktorius. Iš lietuviško nekilnojamojo turto skelbimo teksto ištrauki duomenis tiksliai ir grąžini TIKTAI JSON objektą — be jokio papildomo teksto, be markdown žymų.
SVARBU: Jei teksto pradžioje yra eilutė "[GPS: lat=XX.XXXX, lng=XX.XXXX]" arba "[GPS koordinatės rastos JS kode: lat=XX.XXXX, lng=XX.XXXX]" — naudok būtent TAS koordinates laukuose lat ir lng.`;

function buildPrompt(url: string, text: string): string {
  return `Skelbimo URL: ${url || '(nežinoma)'}

Skelbimo tekstas:
${text.slice(0, MAX_TEXT)}

Ištrauk šiuos duomenis ir grąžink TIKTAI JSON:
{
  "pavadinimas": "sodybos/namo pavadinimas arba trumpas adresas",
  "adresas": "pilnas adresas (gatvė, miestas/kaimas, rajonas)",
  "kaina": 000000,
  "plotas_namas": 00,
  "plotas_sklypas": "00 a",
  "kambariai": 0,
  "statybos_metai": 0000,
  "lat": 00.000000,
  "lng": 00.000000,
  "vardas": "pardavėjo vardas arba null",
  "tel": "+37060000000 arba null",
  "komentaras": "iki 300 simbolių santrauka",
  "upelis": false,
  "tvenkinys": false,
  "sodas": false,
  "medziai": false
}

Taisyklės:
- kaina: tik skaičius eurais, be tarpų ir simbolių. null jei nerasta.
- plotas_namas: tik skaičius m². null jei nerasta.
- plotas_sklypas: skaičius + vienetas ("45 a", "1.2 ha", "500 m²"). null jei nerasta.
- kambariai: tik skaičius. null jei nerasta.
- statybos_metai: 4 skaitmenų metai. null jei nerasta.
- lat/lng: GPS koordinatės jei rastos tekste (ieškok skaičių apie 54-56 / 21-27). null jei nerastos.
- upelis: true jei minimas upelis, upė, upelė, upokšnis.
- tvenkinys: true jei minimas tvenkinys, ežeras, ežerėlis, kūdra, baseinas.
- sodas: true jei minimas sodas, vaismedžiai, daržas, uogakrūmiai.
- medziai: true jei minimi medžiai, miškelis, giria, miškas, giraitė.`;
}

async function callClaude(apiKey: string, url: string, text: string) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: buildPrompt(url, text) }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!r.ok) throw new Error(`Claude API: ${await r.text()}`);

  const data = await r.json() as any;
  const raw = data.content?.[0]?.text ?? '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Nepavyko išanalizuoti Claude atsakymo');
  return JSON.parse(match[0]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const { text, url, html } = req.body as { text?: string; url?: string; html?: string };

  let sourceText = text?.trim() ?? '';
  let nuotrauka: string | null = null;

  // Mode 1: HTML from iOS Shortcut ("Get Details of Safari Web Page" → Page Source)
  // The page is already loaded in the user's real browser — Cloudflare already passed.
  if (html && html.length > 200) {
    const truncated = html.slice(0, 300_000); // ~300KB max
    nuotrauka = extractOgImage(truncated, url);
    sourceText = htmlToText(truncated);
  }

  // Mode 2: Auto-fetch — URL given but no text (server-side fetch, blocked by Cloudflare)
  if (!sourceText || sourceText.length < 50) {
    if (url?.startsWith('http')) {
      const fetched = await fetchUrl(url);
      if ('blocked' in fetched) {
        return res.status(200).json({ ok: false, blocked: true });
      }
      sourceText = fetched.text;
      nuotrauka = fetched.nuotrauka ?? null;
    }
  }

  // Mode 3: Pasted text (bookmarklet or manual)
  // Extract og:image hint if bookmarklet included [IMG: ...] prefix
  if (!nuotrauka && sourceText.startsWith('[IMG:')) {
    const imgMatch = sourceText.match(/^\[IMG:\s*([^\]]+)\]/);
    if (imgMatch) { nuotrauka = imgMatch[1].trim(); sourceText = sourceText.slice(imgMatch[0].length).trim(); }
  }

  if (sourceText.length < 50) {
    return res.status(400).json({ error: 'Per mažai teksto' });
  }

  try {
    const parsed = await callClaude(apiKey, url ?? '', sourceText);
    // appUrl: deep-link back into the app with pre-filled data (used by iOS Shortcut)
    const payload = encodeURIComponent(JSON.stringify({ data: parsed, nuotrauka, url: url ?? '' }));
    const appUrl = `https://sodybu-db.vercel.app/#shortcut/${payload}`;
    return res.json({ ok: true, data: parsed, nuotrauka, appUrl });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
