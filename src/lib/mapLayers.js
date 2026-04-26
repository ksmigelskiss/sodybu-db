import L from 'leaflet';
import { STATUS_THEME, VIETA_THEME } from './theme.js';

const _pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="28" viewBox="0 0 20 28"><path d="M10 0C4.5 0 0 4.5 0 10c0 7.5 10 18 10 18S20 17.5 20 10 15.5 0 10 0z" fill="%23ef4444" stroke="white" stroke-width="1.5"/><circle cx="10" cy="10" r="4" fill="white"/></svg>`;
export const PIN_CURSOR = `url("data:image/svg+xml,${_pinSvg}") 10 27, crosshair`;

export const LAYERS = {
  map: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)', maxZoom: 17,
  }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri, Maxar, Earthstar Geographics', maxZoom: 19,
  }),
};

const CadastreLayer = L.TileLayer.extend({
  getTileUrl(coords) {
    const b = this._tileCoordsToBounds(coords);
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
    const sz = this.getTileSize();
    return `https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer/export` +
      `?bbox=${bbox}&bboxSR=4326&size=${sz.x},${sz.y}&format=png32&transparent=true&f=image&dpi=96`;
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

let cadastreInstance = null;
export function getCadastreLayer() {
  if (!cadastreInstance) cadastreInstance = new CadastreLayer('', { opacity: 0.8, minZoom: 13, maxZoom: 19, tileSize: 256 });
  return cadastreInstance;
}

const scoreColor = (score) => score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#6b7280';

export function makeMarkerIcon(score, statusas) {
  const st = STATUS_THEME[statusas]?.marker;
  const bg   = st?.bg   ?? scoreColor(score);
  const text = st?.text ?? (score ?? '?');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="12" fill="${bg}" stroke="white" stroke-width="2"/>
    <text x="14" y="18.5" text-anchor="middle" font-size="11" font-weight="bold" fill="white">${text}</text>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
}

export function makeVietaIcon(statusas, saltinis) {
  const colors = { aplankyta: '#2563eb', atmesta: '#6b7280' };
  const color = colors[statusas] ?? '#d97706';
  const isSkelbimas = saltinis === 'skelbimas';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="30" viewBox="0 0 26 30">
    <path d="M13 2 L24 11 L20 11 L20 27 L6 27 L6 11 L2 11 Z" fill="${color}" stroke="white" stroke-width="2"/>
    <rect x="10" y="17" width="6" height="10" rx="1" fill="white" opacity="0.85"/>
    ${isSkelbimas ? `<circle cx="21" cy="6" r="6" fill="#f59e0b" stroke="white" stroke-width="1.5"/><text x="21" y="10" text-anchor="middle" font-size="7" font-weight="bold" fill="white">S</text>` : ''}
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [26, 30], iconAnchor: [13, 30] });
}

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});
