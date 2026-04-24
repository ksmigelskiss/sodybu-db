import { wgs84ToLKS94 } from './coords.ts';

const BASE = 'https://www.geoportal.lt/mapproxy';
const EXT = 400; // bbox pusė (metrais)

async function identify(service: string, x: number, y: number) {
  const params = new URLSearchParams({
    f: 'json',
    geometry: JSON.stringify({ x, y }),
    geometryType: 'esriGeometryPoint',
    sr: '3346',
    layers: 'all',
    tolerance: '5',
    returnGeometry: 'false',
    returnFieldName: 'true',
    returnUnformattedValues: 'false',
    mapExtent: `${x - EXT},${y - EXT},${x + EXT},${y + EXT}`,
    imageDisplay: '800,800,96',
  });

  const res = await fetch(`${BASE}/${service}/MapServer/identify?${params}`, {
    headers: { 'User-Agent': 'sodybu-db/0.1' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`geoportal ${service}: HTTP ${res.status}`);
  const data = await res.json() as { results?: any[] };
  return data.results ?? [];
}

async function wmsFeatureInfo(service: string, layerName: string, lng: number, lat: number) {
  const d = 0.005; // ~500m
  const params = new URLSearchParams({
    SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetFeatureInfo',
    BBOX: `${lat - d},${lng - d},${lat + d},${lng + d}`,
    CRS: 'EPSG:4326',
    WIDTH: '11', HEIGHT: '11', I: '5', J: '5',
    LAYERS: layerName, QUERY_LAYERS: layerName,
    INFO_FORMAT: 'application/json',
  });

  const res = await fetch(`${BASE}/${service}?${params}`, {
    headers: { 'User-Agent': 'sodybu-db/0.1' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) return [];
  try {
    const data = await res.json() as { features?: any[] };
    return data.features ?? [];
  } catch {
    return [];
  }
}

export interface GeoCheck {
  miskas_m: number | null;
  upelis_m: number | null;
  natura2000: boolean;
  saugomos_terit: boolean;
  kultura_paveldas: boolean;
  szns_raw: Record<string, any[]>;
}

export async function checkSodyba(lat: number, lng: number): Promise<GeoCheck> {
  const [x, y] = wgs84ToLKS94(lng, lat);

  // Paraleliai kviečiame visus servisus
  const [szns, miskai, kvr, uetk, stk] = await Promise.allSettled([
    identify('rc_szns', x, y),
    identify('vmt_mkd', x, y),
    identify('kpd_kvr', x, y),
    wmsFeatureInfo('am_uetk', 'uetk', lng, lat),
    wmsFeatureInfo('vstt_stk', 'STK', lng, lat),
  ]);

  const sznsResults = szns.status === 'fulfilled' ? szns.value : [];
  const miskaResults = miskai.status === 'fulfilled' ? miskai.value : [];
  const kvrResults = kvr.status === 'fulfilled' ? kvr.value : [];
  const uetResults = uetk.status === 'fulfilled' ? uetk.value : [];
  const stkResults = stk.status === 'fulfilled' ? stk.value : [];

  // Miškas: ar yra miško kadastro duomenys šiame taške?
  const miskas_m = miskaResults.length > 0 ? 0 : null;

  // Upė/ežeras: ar UETK aptiko vandens kūną?
  const upelis_m = uetResults.length > 0 ? 0 : null;

  // Natura 2000, saugomos teritorijos
  const natura2000 = sznsResults.some((r: any) =>
    r.layerName?.includes('Natura') || r.layerName?.includes('natura')
  );
  const saugomos_terit = stkResults.length > 0;

  // Kultūros paveldas
  const kultura_paveldas = kvrResults.length > 0;

  return {
    miskas_m,
    upelis_m,
    natura2000,
    saugomos_terit,
    kultura_paveldas,
    szns_raw: {
      szns: sznsResults,
      miskai: miskaResults,
      kvr: kvrResults,
      uetk: uetResults,
      stk: stkResults,
    },
  };
}
