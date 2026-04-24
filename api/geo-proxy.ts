import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE = 'https://www.geoportal.lt/mapproxy';
const EXT = 400;

function lks94(lng: number, lat: number): [number, number] {
  // Simplified inline conversion (no proj4 dep in edge)
  // Using proj4 formula for LKS94 (EPSG:3346)
  const a = 6378137.0, f = 1 / 298.257222101;
  const k0 = 0.9998, lon0 = 24 * Math.PI / 180;
  const FE = 500000, FN = 0;
  const e2 = 2 * f - f * f;
  const n = f / (2 - f);
  const A = a / (1 + n) * (1 + n * n / 4 + n * n * n * n / 64);

  const phi = lat * Math.PI / 180;
  const lam = lng * Math.PI / 180;
  const t = Math.tan(phi);
  const xi = Math.atanh(Math.sin(phi)) - Math.sqrt(e2) * Math.atanh(Math.sqrt(e2) * Math.sin(phi));
  const eta = lam - lon0;

  const alpha = [
    n / 2 - 2 * n * n / 3 + 5 * n * n * n / 16,
    13 * n * n / 48 - 3 * n * n * n / 5,
    61 * n * n * n / 240,
  ];

  let xiP = xi;
  let etaP = eta;
  for (let j = 1; j <= 3; j++) {
    xiP += alpha[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    etaP += alpha[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }

  const x = FE + k0 * A * etaP;
  const y = FN + k0 * A * xiP;
  return [x, y];
}

async function identify(service: string, x: number, y: number) {
  const params = new URLSearchParams({
    f: 'json',
    geometry: JSON.stringify({ x, y }),
    geometryType: 'esriGeometryPoint',
    sr: '3346', layers: 'all', tolerance: '5',
    returnGeometry: 'false', returnFieldName: 'true',
    mapExtent: `${x - EXT},${y - EXT},${x + EXT},${y + EXT}`,
    imageDisplay: '800,800,96',
  });
  const res = await fetch(`${BASE}/${service}/MapServer/identify?${params}`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];
  const d = await res.json() as { results?: unknown[] };
  return d.results ?? [];
}

async function wms(service: string, layer: string, lng: number, lat: number) {
  const d = 0.005;
  const params = new URLSearchParams({
    SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetFeatureInfo',
    BBOX: `${lat - d},${lng - d},${lat + d},${lng + d}`,
    CRS: 'EPSG:4326', WIDTH: '11', HEIGHT: '11', I: '5', J: '5',
    LAYERS: layer, QUERY_LAYERS: layer, INFO_FORMAT: 'application/json',
  });
  const res = await fetch(`${BASE}/${service}?${params}`, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return [];
  try { const d2 = await res.json() as { features?: unknown[] }; return d2.features ?? []; }
  catch { return []; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { lat, lng } = req.body as { lat: number; lng: number };
  if (!lat || !lng) return res.status(400).json({ error: 'lat/lng required' });

  const [x, y] = lks94(lng, lat);

  const [szns, miskai, kvr, uetk, stk] = await Promise.allSettled([
    identify('rc_szns', x, y),
    identify('vmt_mkd', x, y),
    identify('kpd_kvr', x, y),
    wms('am_uetk', 'uetk', lng, lat),
    wms('vstt_stk', 'STK', lng, lat),
  ]);

  const get = (r: PromiseSettledResult<unknown[]>) => r.status === 'fulfilled' ? r.value : [];

  return res.json({
    miskas_m: get(miskai).length > 0 ? 0 : null,
    upelis_m: get(uetk).length > 0 ? 0 : null,
    natura2000: get(szns).some((r: any) => r.layerName?.toLowerCase().includes('natura')),
    saugomos_terit: get(stk).length > 0,
    kultura_paveldas: get(kvr).length > 0,
    raw: { szns: get(szns), miskai: get(miskai), kvr: get(kvr), uetk: get(uetk), stk: get(stk) },
  });
}
