import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

async function fetchPolygon(gyv_kodas) {
  const res = await fetch(`/api/polygon-proxy?gyv_kodas=${gyv_kodas}`);
  if (!res.ok) return null;
  const { coords } = await res.json();
  return coords?.length ? coords : null;
}

const OVERPASS = 'https://overpass-api.de/api/interpreter';

async function fetchFeatures(bbox) {
  const [s, w, n, e] = bbox;
  const q = `[out:json][timeout:25];
(
  way["building"](${s},${w},${n},${e});
  node["building"](${s},${w},${n},${e});
  way["natural"="water"](${s},${w},${n},${e});
  way["waterway"~"river|stream|canal|ditch"](${s},${w},${n},${e});
);
out geom;`;
  const res = await fetch(OVERPASS, {
    method: 'POST',
    body: `data=${encodeURIComponent(q)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.elements ?? [];
}

function renderFeatures(map, elements) {
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
          color: '#3b82f6', weight: 2, opacity: 0.8,
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

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const LAYERS = {
  map: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19,
  }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri, Maxar, Earthstar Geographics', maxZoom: 19,
  }),
};

const scoreColor = (score) => {
  if (score >= 70) return '#16a34a';
  if (score >= 40) return '#d97706';
  return '#6b7280';
};

function makeIcon(score) {
  const color = scoreColor(score);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="14" y="18" text-anchor="middle" font-size="10" font-weight="bold" fill="white">${score ?? '?'}</text>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
}

export default function SodybaMap({ items, selected, onSelect, userPos }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const polygonRef = useRef(null);
  const featureLayersRef = useRef([]);
  const featureCacheRef = useRef(new Map()); // gyv_kodas → elements[]
  const [isSatellite, setIsSatellite] = useState(false);

  useEffect(() => {
    if (mapRef.current) return;
    mapRef.current = L.map(containerRef.current).setView([55.3, 23.9], 7);
    LAYERS.map.addTo(mapRef.current);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const next = isSatellite ? 'satellite' : 'map';
    const prev = isSatellite ? 'map' : 'satellite';
    map.removeLayer(LAYERS[prev]);
    LAYERS[next].addTo(map);
  }, [isSatellite]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    items.forEach(s => {
      if (!s.lat || !s.lng) return;
      const label = s.pavadinimas || s.adresas || `${s.lat.toFixed(3)}, ${s.lng.toFixed(3)}`;
      const m = L.marker([s.lat, s.lng], { icon: makeIcon(s.score) })
        .addTo(map)
        .bindTooltip(label);
      m.on('click', () => onSelect(s));
      markersRef.current[s.id] = m;
    });
  }, [items]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Išvalom ankstesnius sluoksnius
    polygonRef.current?.remove();
    polygonRef.current = null;
    featureLayersRef.current.forEach(l => l.remove());
    featureLayersRef.current = [];

    if (!selected) return;

    map.setView([selected.lat, selected.lng], 13);

    if (!selected.gyv_kodas) return;

    fetchPolygon(selected.gyv_kodas).then(coords => {
      if (!coords || !mapRef.current) return;

      polygonRef.current = L.polygon(coords, {
        color: '#2563eb', weight: 2, fillColor: '#2563eb', fillOpacity: 0.08,
      }).addTo(mapRef.current);

      // Bbox iš polygon koordinačių
      const lats = coords.map(c => c[0]);
      const lngs = coords.map(c => c[1]);
      const bbox = [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)];

      const gk = selected.gyv_kodas;
      if (featureCacheRef.current.has(gk)) {
        featureLayersRef.current = renderFeatures(mapRef.current, featureCacheRef.current.get(gk));
      } else {
        fetchFeatures(bbox).then(elements => {
          if (!mapRef.current) return;
          featureCacheRef.current.set(gk, elements);
          featureLayersRef.current = renderFeatures(mapRef.current, elements);
        });
      }
    });
  }, [selected?.id]);

  useEffect(() => {
    if (!userPos || !mapRef.current) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = L.circleMarker([userPos.lat, userPos.lng], {
      radius: 8, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.8,
    }).addTo(mapRef.current).bindTooltip('Jūs čia');
    mapRef.current.setView([userPos.lat, userPos.lng], 11);
  }, [userPos]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      <button
        onClick={() => setIsSatellite(s => !s)}
        style={{
          position: 'absolute', bottom: 24, left: 12, zIndex: 1000,
          background: 'white', border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        {isSatellite ? '🗺 Žemėlapis' : '🛰 Palydovas'}
      </button>
    </div>
  );
}
