import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query.q as string;
  if (!q || q.trim().length < 2) return res.json([]);

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=lt&limit=6&addressdetails=1&accept-language=lt`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'sodybu-db/1.0 (sodybu-db.vercel.app)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return res.json([]);
    const data = await r.json();
    return res.json(Array.isArray(data) ? data : []);
  } catch {
    return res.json([]);
  }
}
