import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400'); // cache 24h
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = (req.query.url as string)?.trim();
  if (!url) return res.status(400).json({ error: 'missing url' });

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!r.ok) return res.status(200).json({ image: null });

    const html = await r.text();

    const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
      ?? null;

    return res.status(200).json({ image: ogImage });
  } catch {
    return res.status(200).json({ image: null });
  }
}
