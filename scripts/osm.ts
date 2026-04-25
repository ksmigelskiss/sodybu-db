const OVERPASS = 'https://overpass-api.de/api/interpreter';

export interface OsmSodyba {
  osm_id: number;
  lat: number;
  lng: number;
  pavadinimas?: string;
  adresas?: string;
  pastato_metai?: number;
  place_type: string;
  tags: Record<string, string>;
}

// place=farm  → viensėdžiai, sodybos kaip vietovardžiai (tiksliausia)
// place=hamlet → maži kaimai (gali turėti kelis namus, bet dažnai viena sodyba)
// Filtruojame per Lietuvos admin ribą — ne bbox, kad nepaimtume Latvijos/Baltarusijos
function buildQuery() {
  // rel(72596) = Lietuva, map_to_area filtruoja tiksliai pagal sieną
  return `
[out:json][timeout:180];
rel(72596);map_to_area->.lt;
(
  node["place"~"^(farm|hamlet|isolated_dwelling)$"](area.lt);
);
out body;
`;
}

export async function fetchOsmSodyba(): Promise<OsmSodyba[]> {
  const body = buildQuery();

  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'sodybu-db/0.1 (research project)',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({ data: body }).toString(),
    signal: AbortSignal.timeout(200_000),
  });

  if (!res.ok) throw new Error(`Overpass: HTTP ${res.status}`);
  const data = await res.json() as { elements: any[] };

  return data.elements
    .filter((el: any) => el.lat != null && el.lon != null)
    .map((el: any) => ({
      osm_id: el.id,
      lat: el.lat,
      lng: el.lon,
      pavadinimas: el.tags?.name ?? el.tags?.['name:lt'] ?? null,
      adresas: formatAdresas(el.tags),
      pastato_metai: parseMetai(el.tags?.['start_date']),
      place_type: el.tags?.place ?? 'farm',
      tags: el.tags ?? {},
    }));
}

function parseMetai(val?: string): number | undefined {
  if (!val) return undefined;
  const m = val.match(/\d{4}/);
  return m ? parseInt(m[0]) : undefined;
}

function formatAdresas(tags: Record<string, string> = {}): string | undefined {
  const parts = [
    tags['addr:street'],
    tags['addr:housenumber'],
    tags['addr:city'] ?? tags['addr:village'] ?? tags['addr:place'],
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : undefined;
}
