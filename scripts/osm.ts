// Overpass API — ieško senų sodybų Lietuvoje

const OVERPASS = 'https://overpass-api.de/api/interpreter';

export interface OsmSodyba {
  osm_id: number;
  lat: number;
  lng: number;
  adresas?: string;
  pastato_metai?: number;
  tags: Record<string, string>;
}

// Overpass QL užklausa: pastatai su farm/farmyard žymomis
function buildQuery(bbox?: [number, number, number, number]) {
  const area = bbox
    ? `(${bbox.join(',')})`
    : '(53.8,20.9,56.5,26.9)'; // visa Lietuva

  return `
[out:json][timeout:120];
(
  node["building"="farm"]${area};
  way["building"="farm"]${area};
  node["building"="farmhouse"]${area};
  way["building"="farmhouse"]${area};
  node["historic"="farm"]${area};
  way["historic"="farm"]${area};
  way["landuse"="farmyard"]${area};
);
out center;
`;
}

export async function fetchOsmSodyba(
  bbox?: [number, number, number, number]
): Promise<OsmSodyba[]> {
  const body = buildQuery(bbox);

  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(body)}`,
    signal: AbortSignal.timeout(130_000),
  });

  if (!res.ok) throw new Error(`Overpass: HTTP ${res.status}`);
  const data = await res.json() as { elements: any[] };

  return data.elements
    .filter((el: any) => el.lat || el.center?.lat)
    .map((el: any) => ({
      osm_id: el.id,
      lat: el.lat ?? el.center.lat,
      lng: el.lon ?? el.center.lon,
      adresas: formatAdresas(el.tags),
      pastato_metai: el.tags?.['start_date']
        ? parseInt(el.tags['start_date'])
        : undefined,
      tags: el.tags ?? {},
    }));
}

function formatAdresas(tags: Record<string, string> = {}): string | undefined {
  const parts = [
    tags['addr:street'],
    tags['addr:housenumber'],
    tags['addr:city'] ?? tags['addr:village'],
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : undefined;
}
