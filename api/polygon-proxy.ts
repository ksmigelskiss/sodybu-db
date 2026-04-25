import type { VercelRequest, VercelResponse } from '@vercel/node';

// LKS94 (EPSG:3346) northing,easting → WGS84 lat,lng
// Inverse Transverse Mercator (iterative)
function lks94ToWgs84(northing: number, easting: number): [number, number] {
  const a = 6378137.0, f = 1 / 298.257222101;
  const k0 = 0.9998, lon0 = 24 * Math.PI / 180;
  const FE = 500000;
  const e2 = 2 * f - f * f;
  const n = f / (2 - f);
  const A = a / (1 + n) * (1 + n * n / 4 + n * n * n * n / 64);

  const beta = [
    n / 2 - 2 * n * n / 3 + 37 * n * n * n / 96,
    n * n / 48 + n * n * n / 15,
    17 * n * n * n / 480,
  ];

  const xiP = northing / (k0 * A);
  const etaP = (easting - FE) / (k0 * A);

  let xi = xiP;
  let eta = etaP;
  for (let j = 1; j <= 3; j++) {
    xi -= beta[j - 1] * Math.sin(2 * j * xiP) * Math.cosh(2 * j * etaP);
    eta -= beta[j - 1] * Math.cos(2 * j * xiP) * Math.sinh(2 * j * etaP);
  }

  const chi = Math.asin(Math.sin(xi) / Math.cosh(eta));
  const delta = [
    e2 / 2 + 5 * e2 * e2 / 24 + e2 * e2 * e2 / 12,
    7 * e2 * e2 / 48 + 29 * e2 * e2 * e2 / 240,
    7 * e2 * e2 * e2 / 120,
  ];
  let phi = chi;
  for (let j = 1; j <= 3; j++) phi += delta[j - 1] * Math.sin(2 * j * chi);

  const lam = lon0 + Math.atan2(Math.sinh(eta), Math.cos(xi));
  return [phi * 180 / Math.PI, lam * 180 / Math.PI];
}

function wktToLatLngs(wkt: string): [number, number][] {
  const match = wkt.match(/POLYGON\s*\(\(([^)]+)\)/);
  if (!match) return [];

  return match[1].split(',').map(p => {
    const parts = p.trim().split(/\s+/).map(Number);
    // WKT order: northing easting
    return lks94ToWgs84(parts[0], parts[1]);
  }).filter(([lat, lng]) => isFinite(lat) && isFinite(lng));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const gyv_kodas = Number(req.query.gyv_kodas ?? (req.body as any)?.gyv_kodas);
  if (!gyv_kodas) return res.status(400).json({ error: 'gyv_kodas required' });

  const url = `https://get.data.gov.lt/datasets/gov/rc/ar/gragyvenamojivietove/GraGyvenamojiVietove?gyv_kodas=${gyv_kodas}&_limit=1`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) return res.status(502).json({ error: `upstream ${r.status}` });

  const data = await r.json() as any;
  const item = data._data?.[0];
  if (!item) return res.status(404).json({ error: 'not found' });

  const coords = wktToLatLngs(item.gyv_vietoves ?? '');
  res.json({ gyv_kodas, coords });
}
