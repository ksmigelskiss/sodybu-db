import type { VercelRequest, VercelResponse } from '@vercel/node';

const HEADERS = { 'User-Agent': 'sodybu-db/1.0 (sodybu-db.vercel.app)' };
// Lithuania bounding box
const VIEWBOX = '20.93,53.90,26.84,56.45';

async function nominatim(q: string, extra: string): Promise<any[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1&accept-language=lt${extra}`;
  const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(5000) });
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = (req.query.q as string)?.trim();
  if (!q || q.length < 2) return res.json([]);

  try {
    // First try: bounded to Lithuania viewbox (better for street+number)
    let results = await nominatim(q, `&viewbox=${VIEWBOX}&bounded=1`);

    // Fallback: country code only (better for village/town names)
    if (results.length === 0) {
      results = await nominatim(q, `&countrycodes=lt`);
    }

    return res.json(results);
  } catch {
    return res.json([]);
  }
}
