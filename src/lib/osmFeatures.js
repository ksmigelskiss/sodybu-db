import L from 'leaflet';

const polygonCache = new Map();

export async function fetchPolygon(gyv_kodas) {
  if (polygonCache.has(gyv_kodas)) return polygonCache.get(gyv_kodas);
  try {
    const res = await fetch(`/api/polygon-proxy?gyv_kodas=${gyv_kodas}`,
      { signal: AbortSignal.timeout(9000) });
    if (!res.ok) return null;
    const { coords } = await res.json();
    const result = coords?.length ? coords : null;
    polygonCache.set(gyv_kodas, result);
    return result;
  } catch {
    return null;
  }
}

export async function fetchOsmFeatures(bbox) {
  const [s, w, n, e] = bbox;
  const res = await fetch(`/api/overpass-proxy?s=${s}&w=${w}&n=${n}&e=${e}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.elements ?? [];
}

export function polygonBbox(coords) {
  const lats = coords.map(c => c[0]);
  const lngs = coords.map(c => c[1]);
  const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const padLat = Math.max((Math.max(...lats) - Math.min(...lats)) / 2, 0.009);
  const padLng = Math.max((Math.max(...lngs) - Math.min(...lngs)) / 2, 0.014);
  return [cLat - padLat, cLng - padLng, cLat + padLat, cLng + padLng];
}


export function renderOsmFeatures(map, elements) {
  const layers = [];
  for (const el of elements) {
    const isBuilding = el.tags?.building;

    if (el.type === 'node' && isBuilding) {
      layers.push(L.circleMarker([el.lat, el.lon], {
        radius: 3, color: '#374151', fillColor: '#9ca3af', fillOpacity: 0.8, weight: 1,
      }).addTo(map));
    } else if (el.type === 'way' && el.geometry?.length && isBuilding) {
      const latlngs = el.geometry.map(p => [p.lat, p.lon]);
      layers.push(L.polygon(latlngs, {
        color: '#374151', weight: 1.5, fillOpacity: 0,
      }).addTo(map));
    }
  }
  return layers;
}
