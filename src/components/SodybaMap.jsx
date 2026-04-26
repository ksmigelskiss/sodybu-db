import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

async function fetchPolygon(gyv_kodas) {
  const res = await fetch(`/api/polygon-proxy?gyv_kodas=${gyv_kodas}`);
  if (!res.ok) return null;
  const { coords } = await res.json();
  return coords?.length ? coords : null;
}

async function fetchFeatures(bbox) {
  const [s, w, n, e] = bbox;
  const res = await fetch(`/api/overpass-proxy?s=${s}&w=${w}&n=${n}&e=${e}`);
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

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const LAYERS = {
  map: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CARTO', maxZoom: 19, subdomains: 'abcd',
  }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri, Maxar, Earthstar Geographics', maxZoom: 19,
  }),
};

// Geoportal.lt kadastro sklypų overlay (ArcGIS export endpoint → rasterio plytelės)
const CadastreLayer = L.TileLayer.extend({
  getTileUrl(coords) {
    const b = this._tileCoordsToBounds(coords);
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
    const sz = this.getTileSize();
    return `https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer/export` +
      `?bbox=${bbox}&bboxSR=4326&size=${sz.x},${sz.y}` +
      `&format=png32&transparent=true&f=image&dpi=96`;
  },
  createTile(coords, done) {
    const img = document.createElement('img');
    img.crossOrigin = '';
    img.onload = () => done(null, img);
    img.onerror = (e) => done(e, img);
    img.src = this.getTileUrl(coords);
    return img;
  },
});

let cadastreLayerInstance = null;
function getCadastreLayer() {
  if (!cadastreLayerInstance) cadastreLayerInstance = new CadastreLayer('', { opacity: 0.8, minZoom: 13, maxZoom: 19, tileSize: 256 });
  return cadastreLayerInstance;
}

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
  const [isCadastre, setIsCadastre] = useState(false);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featuresCount, setFeaturesCount] = useState(null);

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
    const layer = getCadastreLayer();
    if (isCadastre) layer.addTo(map);
    else map.removeLayer(layer);
  }, [isCadastre]);

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

    polygonRef.current?.remove();
    polygonRef.current = null;
    featureLayersRef.current.forEach(l => l.remove());
    featureLayersRef.current = [];
    setFeaturesCount(null);

    if (!selected) return;

    map.setView([selected.lat, selected.lng], 13);

    if (!selected.gyv_kodas) return;

    fetchPolygon(selected.gyv_kodas).then(coords => {
      if (!coords || !mapRef.current) return;

      polygonRef.current = L.polygon(coords, {
        color: '#2563eb', weight: 2, fillColor: '#2563eb', fillOpacity: 0.08,
      }).addTo(mapRef.current);

      mapRef.current.fitBounds(polygonRef.current.getBounds(), { padding: [40, 40], maxZoom: 15 });

      // Bbox iš polygon koordinačių su minimaliu 1km buferiu
      const lats = coords.map(c => c[0]);
      const lngs = coords.map(c => c[1]);
      const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const padLat = Math.max((Math.max(...lats) - Math.min(...lats)) / 2, 0.009); // ~1km
      const padLng = Math.max((Math.max(...lngs) - Math.min(...lngs)) / 2, 0.014);
      const bbox = [cLat - padLat, cLng - padLng, cLat + padLat, cLng + padLng];

      const gk = selected.gyv_kodas;
      if (featureCacheRef.current.has(gk)) {
        featureLayersRef.current = renderFeatures(mapRef.current, featureCacheRef.current.get(gk));
      } else {
        setFeaturesLoading(true);
        setFeaturesCount(null);
        fetchFeatures(bbox).then(elements => {
          if (!mapRef.current) return;
          featureCacheRef.current.set(gk, elements);
          featureLayersRef.current = renderFeatures(mapRef.current, elements);
          setFeaturesCount(elements.length);
        }).finally(() => setFeaturesLoading(false));
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
      <div style={{ position: 'absolute', bottom: 24, left: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={() => setIsSatellite(s => !s)}
          style={{
            background: 'white', border: '2px solid rgba(0,0,0,0.2)',
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {isSatellite ? '🗺 Žemėlapis' : '🛰 Palydovas'}
        </button>
        <button
          onClick={() => setIsCadastre(s => !s)}
          style={{
            background: isCadastre ? '#2563eb' : 'white',
            color: isCadastre ? 'white' : '#374151',
            border: '2px solid rgba(0,0,0,0.2)',
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          📐 Sklypai
        </button>
      </div>
      {(featuresLoading || featuresCount !== null) && (
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'white', borderRadius: 8, padding: '6px 14px',
          fontSize: 12, color: '#6b7280', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}>
          {featuresLoading
            ? 'Kraunami OSM objektai…'
            : featuresCount === 0
              ? 'OSM: pastatų / vandens nerasta šioje zonoje'
              : `OSM: ${featuresCount} objektai rasti`}
        </div>
      )}
    </div>
  );
}
