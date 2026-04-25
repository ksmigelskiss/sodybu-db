import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
    if (!selected || !mapRef.current) return;
    mapRef.current.setView([selected.lat, selected.lng], 13);
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
