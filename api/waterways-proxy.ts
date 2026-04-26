import type { VercelRequest, VercelResponse } from '@vercel/node';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { s, w, n, e } = req.query as Record<string, string>;
  if (!s || !w || !n || !e) return res.status(400).json({ error: 'bbox required: s,w,n,e' });

  // Only rivers/streams/canals — skip ditch/drain to stay under Vercel 10s limit
  const q = `[out:json][timeout:8];
(
  way["waterway"~"river|stream|canal"](${s},${w},${n},${e});
  way["natural"="water"](${s},${w},${n},${e});
);
out geom qt;`;

  for (const endpoint of ENDPOINTS) {
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(q)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(9000),
      });
      if (!r.ok) continue;
      const data = await r.json() as any;
      return res.json({ elements: data.elements ?? [] });
    } catch {
      continue;
    }
  }

  return res.json({ elements: [] });
}
