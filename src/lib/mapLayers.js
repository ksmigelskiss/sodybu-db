import L from 'leaflet';
import { STATUS_THEME, VIETA_THEME } from './theme.js';

const _pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="28" viewBox="0 0 20 28"><path d="M10 0C4.5 0 0 4.5 0 10c0 7.5 10 18 10 18S20 17.5 20 10 15.5 0 10 0z" fill="%23ef4444" stroke="white" stroke-width="1.5"/><circle cx="10" cy="10" r="4" fill="white"/></svg>`;
export const PIN_CURSOR = `url("data:image/svg+xml,${_pinSvg}") 10 27, crosshair`;

export const LAYERS = {
  map: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)', maxZoom: 17,
  }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri, Maxar, Earthstar Geographics', maxNativeZoom: 18, maxZoom: 20,
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

const scoreColor = (score) => score >= 70 ? '#137333' : score >= 40 ? '#e37400' : '#5f6368';

export function makeMarkerIcon(score, statusas) {
  const st = STATUS_THEME[statusas]?.marker;
  const bg   = st?.bg   ?? scoreColor(score);
  const text = st?.text ?? (score ?? '?');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <ellipse cx="16" cy="30" rx="7" ry="2.5" fill="rgba(0,0,0,0.15)"/>
    <circle cx="16" cy="15" r="13" fill="${bg}" stroke="white" stroke-width="2"/>
    <text x="16" y="19.5" text-anchor="middle" font-size="11" font-weight="700" fill="white" font-family="system-ui,sans-serif">${text}</text>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
}

export function makeVietaIcon(statusas, saltinis) {
  const colors = { nuvaziuoti: '#137333', aplankyta: '#1a73e8', atmesta: '#5f6368' };
  const color = colors[statusas] ?? '#e37400';
  const isSkelbimas = saltinis === 'skelbimas';
  // Google Maps-style teardrop pin with house icon
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38">
    <ellipse cx="15" cy="36" rx="6" ry="2.5" fill="rgba(0,0,0,0.18)"/>
    <path d="M15 2C8.9 2 4 6.9 4 13C4 21.5 15 35 15 35C15 35 26 21.5 26 13C26 6.9 21.1 2 15 2Z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <path d="M15 8L21 13H19.5V20H10.5V13H9L15 8Z" fill="white" opacity="0.95"/>
    <rect x="13" y="15.5" width="4" height="4.5" rx="0.5" fill="${color}"/>
    ${isSkelbimas ? `<circle cx="23" cy="6" r="5.5" fill="#e37400" stroke="white" stroke-width="1.5"/><text x="23" y="9.5" text-anchor="middle" font-size="6.5" font-weight="bold" fill="white" font-family="system-ui">€</text>` : ''}
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [30, 38], iconAnchor: [15, 35] });
}

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});
