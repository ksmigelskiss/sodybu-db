import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LAYERS, getCadastreLayer, makeMarkerIcon, makeVietaIcon, PIN_CURSOR } from '../lib/mapLayers.js';
import { fetchPolygon, fetchOsmFeatures, polygonBbox, renderOsmFeatures } from '../lib/osmFeatures.js';
import { APSKRITYS } from '../lib/apskritys.js';

function makeApskritisIcon(label) {
  const html = `<div style="display:inline-block;transform:translate(-50%,-50%);background:rgba(30,41,59,0.88);color:white;border-radius:20px;padding:5px 13px;font-size:13px;font-weight:700;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.3);pointer-events:auto;">${label}</div>`;
  return L.divIcon({ html, className: '', iconSize: [0, 0], iconAnchor: [0, 0] });
}

// Module-level cache — persists across renders
const geoCache = new Map();

async function loadCountyGeo(county) {
  if (geoCache.has(county.id)) return geoCache.get(county.id);
  const q = `${county.label} apskritis Lithuania`;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&polygon_geojson=1&limit=1`);
    const data = await res.json();
    const geo = data[0]?.geojson ?? null;
    geoCache.set(county.id, geo);
    return geo;
  } catch {
    return null;
  }
}

export default function SodybaMap({
  items, selected, onSelect, userPos,
  vietos, addMode, onMapClick, onVietaSelect, selectedVieta,
  activeTab, searchPos,
  selectedApskritis, onApskritisSelect,
  newVietaPos,
  addModeHint,
}) {
  const containerRef         = useRef(null);
  const mapRef               = useRef(null);
  const markersRef           = useRef({});
  const vietaMarkersRef      = useRef([]);
  const apskritisMarkersRef  = useRef([]);
  const apskritisPolyRef     = useRef([]);
  const selectedCountyRef    = useRef(null);
  const userMarkerRef        = useRef(null);
  const searchMarkerRef      = useRef(null);
  const newVietaMarkerRef    = useRef(null);
  const polygonRef           = useRef(null);
  const featureLayersRef     = useRef([]);
  const featureCacheRef      = useRef(new Map());

  const [isSatellite, setIsSatellite]           = useState(false);
  const [isCadastre, setIsCadastre]             = useState(false);
  const [featuresLoading, setFeaturesLoading]   = useState(false);
  const [featuresCount, setFeaturesCount]       = useState(null);

  // Init map + custom pane for waterways (below overlay, above tiles)
  useEffect(() => {
    if (mapRef.current) return;
    mapRef.current = L.map(containerRef.current).setView([55.3, 23.9], 7);
    LAYERS.map.addTo(mapRef.current);
  }, []);

  // Base layer toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.removeLayer(LAYERS[isSatellite ? 'map' : 'satellite']);
    LAYERS[isSatellite ? 'satellite' : 'map'].addTo(map);
  }, [isSatellite]);

  // Cadastre overlay toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = getCadastreLayer();
    if (isCadastre) layer.addTo(map);
    else map.removeLayer(layer);
  }, [isCadastre]);

  // County outlines + label markers (overview mode)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    apskritisMarkersRef.current.forEach(m => m.remove());
    apskritisMarkersRef.current = [];
    apskritisPolyRef.current.forEach(l => l.remove());
    apskritisPolyRef.current = [];

    if (selectedApskritis) return;

    const timers = [];
    APSKRITYS.forEach((a, i) => {
      const m = L.marker([a.lat, a.lng], { icon: makeApskritisIcon(a.label), zIndexOffset: 200 }).addTo(map);
      m.on('click', (e) => { L.DomEvent.stopPropagation(e); onApskritisSelect?.(a); });
      apskritisMarkersRef.current.push(m);

      timers.push(setTimeout(() => {
        loadCountyGeo(a).then(geo => {
          if (!geo || !mapRef.current) return;
          const layer = L.geoJSON(geo, {
            style: { color: '#2563eb', weight: 1.5, fillColor: '#3b82f6', fillOpacity: 0.07 },
          });
          layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.18 }));
          layer.on('mouseout',  () => layer.setStyle({ fillOpacity: 0.07 }));
          layer.on('click', (e) => { L.DomEvent.stopPropagation(e); onApskritisSelect?.(a); });
          layer.addTo(mapRef.current);
          apskritisPolyRef.current.push(layer);
        });
      }, i * 200));
    });
    return () => timers.forEach(clearTimeout);
  }, [selectedApskritis, activeTab]);

  // Selected county border
  useEffect(() => {
    selectedCountyRef.current?.remove();
    selectedCountyRef.current = null;
    if (!selectedApskritis || !mapRef.current) return;

    loadCountyGeo(selectedApskritis).then(geo => {
      if (!geo || !mapRef.current) return;
      selectedCountyRef.current = L.geoJSON(geo, {
        style: { color: '#2563eb', weight: 2, fillOpacity: 0, dashArray: '6 4' },
      }).addTo(mapRef.current);
    });
  }, [selectedApskritis?.id]);

  // Zoom to selected apskritis or reset to Lithuania overview
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selectedApskritis) {
      map.setView([55.3, 23.9], 7);
    } else {
      map.fitBounds(selectedApskritis.bounds, { padding: [30, 30] });
    }
  }, [selectedApskritis?.id]);

  // Zone markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    items.forEach(s => {
      if (!s.lat || !s.lng) return;
      const label = s.pavadinimas || s.adresas || `${s.lat.toFixed(3)}, ${s.lng.toFixed(3)}`;
      const m = L.marker([s.lat, s.lng], { icon: makeMarkerIcon(s.score, s.statusas) })
        .addTo(map).bindTooltip(label);
      m.on('click', (e) => { L.DomEvent.stopPropagation(e); onSelect(s); });
      markersRef.current[s.id] = m;
    });
  }, [items]);

  // Vieta markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    vietaMarkersRef.current.forEach(m => m.remove());
    vietaMarkersRef.current = [];
    (vietos ?? []).forEach(v => {
      if (!v.lat || !v.lng) return;
      const label = v.zonaPavadinimas || `${v.lat.toFixed(3)}, ${v.lng.toFixed(3)}`;
      const m = L.marker([v.lat, v.lng], { icon: makeVietaIcon(v.statusas, v.saltinis), zIndexOffset: 100 })
        .addTo(map).bindTooltip(label);
      m.on('click', (e) => { L.DomEvent.stopPropagation(e); onVietaSelect?.(v); });
      vietaMarkersRef.current.push(m);
    });
  }, [vietos]);

  // addMode cursor + click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const container = map.getContainer();
    if (!addMode) { container.style.cursor = ''; return; }
    container.style.cursor = PIN_CURSOR;
    const handler = (e) => onMapClick?.(e.latlng.lat, e.latlng.lng);
    map.on('click', handler);
    return () => { map.off('click', handler); container.style.cursor = ''; };
  }, [addMode, onMapClick]);

  // Selected zone — polygon + OSM features
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    polygonRef.current?.remove();
    polygonRef.current = null;
    featureLayersRef.current.forEach(l => l.remove());
    featureLayersRef.current = [];
    setFeaturesCount(null);

    if (!selected?.gyv_kodas) {
      if (selected) map.setView([selected.lat, selected.lng], 13);
      return;
    }

    map.setView([selected.lat, selected.lng], 13);

    fetchPolygon(selected.gyv_kodas).then(coords => {
      if (!coords || !mapRef.current) return;
      polygonRef.current = L.polygon(coords, {
        color: '#eab308', weight: 2.5, fillColor: '#eab308', fillOpacity: 0.08,
      }).addTo(mapRef.current);
      mapRef.current.fitBounds(polygonRef.current.getBounds(), { padding: [40, 40], maxZoom: 15 });

      const bbox = polygonBbox(coords);
      const gk = selected.gyv_kodas;
      if (featureCacheRef.current.has(gk)) {
        featureLayersRef.current = renderOsmFeatures(mapRef.current, featureCacheRef.current.get(gk));
        setFeaturesCount(featureCacheRef.current.get(gk).length);
      } else {
        setFeaturesLoading(true);
        fetchOsmFeatures(bbox).then(elements => {
          if (!mapRef.current) return;
          featureCacheRef.current.set(gk, elements);
          featureLayersRef.current = renderOsmFeatures(mapRef.current, elements);
          setFeaturesCount(elements.length);
        }).finally(() => setFeaturesLoading(false));
      }
    });
  }, [selected?.id]);

  // Selected vieta — zoom (skip if no location, e.g. skelbimas without pin)
  useEffect(() => {
    if (!selectedVieta?.lat || !selectedVieta?.lng || !mapRef.current) return;
    mapRef.current.setView([selectedVieta.lat, selectedVieta.lng], 15);
  }, [selectedVieta?.id]);

  // Search position — pan + drop pin
  useEffect(() => {
    searchMarkerRef.current?.remove();
    searchMarkerRef.current = null;
    if (!searchPos || !mapRef.current) return;
    mapRef.current.setView([searchPos.lat, searchPos.lng], 15);
    searchMarkerRef.current = L.circleMarker([searchPos.lat, searchPos.lng], {
      radius: 7, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2,
    }).addTo(mapRef.current).bindTooltip('Paieškos rezultatas', { permanent: false });
  }, [searchPos]);

  // Atrinktos tab — fit map to all saved vietos
  useEffect(() => {
    if (activeTab !== 'atrinktos' || !mapRef.current) return;
    const pts = (vietos ?? []).filter(v => v.lat && v.lng);
    if (pts.length === 0) return;
    const bounds = L.latLngBounds(pts.map(v => [v.lat, v.lng]));
    if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }, [activeTab]);

  // New vieta pin marker
  useEffect(() => {
    newVietaMarkerRef.current?.remove();
    newVietaMarkerRef.current = null;
    if (!newVietaPos || !mapRef.current) return;
    newVietaMarkerRef.current = L.marker([newVietaPos.lat, newVietaPos.lng], {
      icon: makeVietaIcon(null), zIndexOffset: 500,
    }).addTo(mapRef.current);
  }, [newVietaPos]);

  // User position
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

      {addMode && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: '#1e293b', color: 'white',
          borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
        }}>
          📍 {addModeHint ?? 'Spustelėkite sodybos vietą žemėlapyje'}
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 24, left: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <MapBtn onClick={() => setIsSatellite(s => !s)}>
          {isSatellite ? '🗺 Žemėlapis' : '🛰 Palydovas'}
        </MapBtn>
        <MapBtn onClick={() => setIsCadastre(s => !s)} active={isCadastre}>
          📐 Sklypai
        </MapBtn>
      </div>

      {(featuresLoading || featuresCount !== null) && (
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'white', borderRadius: 8, padding: '6px 14px',
          fontSize: 12, color: '#6b7280', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}>
          {featuresLoading ? 'Kraunami OSM objektai…'
            : featuresCount === 0 ? 'OSM: pastatų / vandens nerasta'
            : `OSM: ${featuresCount} objektai`}
        </div>
      )}
    </div>
  );
}

function MapBtn({ onClick, active, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#2563eb' : 'white', color: active ? 'white' : '#374151',
      border: '2px solid rgba(0,0,0,0.2)', borderRadius: 8, padding: '6px 12px',
      cursor: 'pointer', fontSize: 13, fontWeight: 600,
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {children}
    </button>
  );
}
