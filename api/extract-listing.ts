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
  const LT_LAT = '(5[3456]\\.\\d{4,})';
  const LT_LNG = '(2[0-6]\\.\\d{4,})';
  const SEP    = '(?:%2C|,\\s*)';      // comma or URL-encoded comma

  // 1a. lat=X + lng=Y anywhere in URL (dp-market, aruodas, custom portals)
  let m = new RegExp(`\\blat=${LT_LAT}[\\s\\S]{0,60}?\\blng=${LT_LNG}`, 'i').exec(html);
  if (m) return `[GPS: lat=${m[1]}, lng=${m[2]}]\n`;

  m = new RegExp(`\\blng=${LT_LNG}[\\s\\S]{0,60}?\\blat=${LT_LAT}`, 'i').exec(html);
  if (m) return `[GPS: lat=${m[2]}, lng=${m[1]}]\n`;

  // 1b. query=lat,lng  or  query=lat%2Clng  (Google Maps search URL)
  m = new RegExp(`[?&]query=${LT_LAT}${SEP}${LT_LNG}`, 'i').exec(html);
  if (m) return `[GPS: lat=${m[1]}, lng=${m[2]}]\n`;

  // 1c. daddr=(lat, lng)  or  daddr=lat,lng  (Google Maps directions)
  m = new RegExp(`\\bdaddr=\\(?${LT_LAT}${SEP}${LT_LNG}`, 'i').exec(html);
  if (m) return `[GPS: lat=${m[1]}, lng=${m[2]}]\n`;

  // 1d. center=lat,lng  or  ll=lat,lng
  m = new RegExp(`\\b(?:center|ll)=${LT_LAT}${SEP}${LT_LNG}`, 'i').exec(html);
  if (m) return `[GPS: lat=${m[1]}, lng=${m[2]}]\n`;

  // 1e. Google Maps @lat,lng in URL (e.g. maps.google.com/@55.12,25.45)
  m = new RegExp(`@${LT_LAT}${SEP}${LT_LNG}`).exec(html);
  if (m) return `[GPS: lat=${m[1]}, lng=${m[2]}]\n`;

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

/** Tries og:image → twitter:image → JSON-LD → first real <img> src (resolved to absolute). */
function extractOgImage(html: string, base?: string, isLiveDom = false): string | null {
  // Helper: extract content= from a meta tag string, handles quoted and unquoted values
  const metaContent = (tag: string) =>
    tag.match(/\bcontent=["']([^"']+)["']/i)?.[1] ??
    tag.match(/\bcontent=([^\s>]+)/i)?.[1];

  // 1. og:image / og:image:url — scan all meta tags
  const metaRe = /<meta\b[^>]+>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(html)) !== null) {
    const tag = m[0];
    if (/property=["']?og:image(?::url)?["']?/i.test(tag)) {
      const v = metaContent(tag);
      if (v && v.startsWith('http')) return resolveUrl(v, base);
    }
  }

  // 2. twitter:image
  metaRe.lastIndex = 0;
  while ((m = metaRe.exec(html)) !== null) {
    const tag = m[0];
    if (/name=["']?twitter:image["']?/i.test(tag)) {
      const v = metaContent(tag);
      if (v && v.startsWith('http')) return resolveUrl(v, base);
    }
  }

  // 3. JSON-LD image
  const ldMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ldMatch) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      const img = ld?.image?.url ?? ld?.image?.[0]?.url ?? ld?.image?.[0] ?? ld?.image;
      if (typeof img === 'string' && img.startsWith('http')) return img;
    } catch { /* ignore */ }
  }

  // 4. First <img> that looks like a real photo.
  //    isLiveDom=true (iOS Shortcut): images are already loaded → src is real, data-src may be gone.
  //    isLiveDom=false (server fetch): lazy-load → prefer data-src over placeholder src.
  const SKIP = /logo|icon|avatar|pixel|1x1|sprite|track|banner|button|arrow|blank|spinner/i;
  const IS_PHOTO = /\.(jpe?g|png|webp)(\?|$)/i;
  const IS_USEFUL_PATH = /\/(photos?|images?|img|uploads?|media|files?|gallery|listings?|thumbs?)\//i;

  const imgTagRe = /<img([^>]+)>/gi;
  while ((m = imgTagRe.exec(html)) !== null) {
    const attrs = m[1];
    const srcMatch = isLiveDom
      ? (attrs.match(/\bsrc=["']([^"']{8,})["']/i) ??
         attrs.match(/\bdata-src=["']([^"']{8,})["']/i))
      : (attrs.match(/\bdata-src=["']([^"']{8,})["']/i) ??
         attrs.match(/\bdata-lazy(?:-src)?=["']([^"']{8,})["']/i) ??
         attrs.match(/\bdata-original=["']([^"']{8,})["']/i) ??
         attrs.match(/\bdata-url=["']([^"']{8,})["']/i) ??
         attrs.match(/\bsrc=["']([^"']{8,})["']/i));
    if (!srcMatch) continue;
    const src = srcMatch[1];
    if (src.startsWith('data:')) continue;
    if (SKIP.test(src)) continue;
    if (!IS_PHOTO.test(src) && !IS_USEFUL_PATH.test(src)) continue;
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
SVARBU: Jei teksto pradžioje yra eilutė prasidedanti "[GPS:" — naudok būtent TAS koordinates laukuose lat ir lng. Pvz. "[GPS: lat=55.1234, lng=24.5678]".`;

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-App-Secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Prevent unauthorized use of Anthropic API credits
  const appSecret = process.env.APP_SECRET;
  if (appSecret && req.headers['x-app-secret'] !== appSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const { text, url, html } = req.body as { text?: string; url?: string; html?: string };

  let sourceText = text?.trim() ?? '';
  let nuotrauka: string | null = null;

  // Mode 1: HTML from iOS Shortcut ("Get Details of Safari Web Page" → Page Source)
  // The page is already loaded in the user's real browser — Cloudflare already passed.
  // isLiveDom=true: rendered DOM, images already loaded into src (no lazy-load data-src needed).
  if (html && html.length > 200) {
    const truncated = html.slice(0, 300_000); // ~300KB max
    nuotrauka = extractOgImage(truncated, url, true);
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
    // appUrl: deep-link back into the app with pre-filled data (used by iOS Shortcut).
    const payload = encodeURIComponent(JSON.stringify({ data: parsed, nuotrauka, url: url ?? '' }));
    const appUrl = `https://sodybu-db.vercel.app/#shortcut/${payload}`;
    // listing_text: full plain text for later use in value-estimate (no re-fetch needed)
    const listing_text = sourceText.slice(0, 8000);
    return res.json({ ok: true, data: parsed, nuotrauka, appUrl, listing_text });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
