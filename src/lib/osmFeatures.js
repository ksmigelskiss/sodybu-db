import L from 'leaflet';

export async function fetchPolygon(gyv_kodas) {
  const res = await fetch(`/api/polygon-proxy?gyv_kodas=${gyv_kodas}`);
  if (!res.ok) return null;
  const { coords } = await res.json();
  return coords?.length ? coords : null;
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
    const isWater = el.tags?.natural === 'water';
    const isWaterway = !!el.tags?.waterway;

    if (el.type === 'node' && isBuilding) {
      layers.push(L.circleMarker([el.lat, el.lon], {
        radius: 3, color: '#374151', fillColor: '#9ca3af', fillOpacity: 0.8, weight: 1,
      }).addTo(map));
    } else if (el.type === 'way' && el.geometry?.length) {
      const latlngs = el.geometry.map(p => [p.lat, p.lon]);
      if (isWater) {
        layers.push(L.polygon(latlngs, {
          color: '#1d4ed8', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.35,
        }).addTo(map));
      } else if (isWaterway) {
        layers.push(L.polyline(latlngs, {
          color: '#3b82f6', weight: 4, opacity: 0.8,
        }).addTo(map));
      } else if (isBuilding) {
        layers.push(L.polygon(latlngs, {
          color: '#374151', weight: 1, fillColor: '#9ca3af', fillOpacity: 0.6,
        }).addTo(map));
      }
    }
  }
  return layers;
}
