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

export function makeVietaIcon(statusas, saltinis, hasInfo, zvaigzdute) {
  if (hasInfo === undefined) hasInfo = saltinis === 'skelbimas';
  const statusColors = { nuvaziuoti: '#1a73e8', aplankyta: '#137333', atmesta: '#c5221f' };
  const color = statusColors[statusas] ?? (hasInfo ? '#e37400' : '#c4c7cc');
  const W = 22, H = 22, totalH = H + 3 + 7; // card + strip + triangle = 32

  const houseSvg =
    `<svg width="13" height="13" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M9 2L16 8H14.5V16H3.5V8H2L9 2Z" fill="white" opacity="0.9"/>` +
    `<rect x="6.5" y="10.5" width="5" height="5.5" rx="0.5" fill="${color}"/>` +
    `</svg>`;

  const starBadge = zvaigzdute
    ? `<div style="position:absolute;top:-5px;left:-5px;width:14px;height:14px;border-radius:50%;` +
      `background:#fbbf24;border:1.5px solid white;text-align:center;line-height:11px;font-size:8px;` +
      `color:white;box-shadow:0 1px 3px rgba(0,0,0,0.3)">★</div>`
    : '';

  const html =
    `<div style="position:relative;width:${W}px;height:${totalH}px">` +
    `<div style="width:${W}px;height:${H}px;border-radius:7px 7px 0 0;` +
    `box-sizing:border-box;border:2px solid white;border-bottom:none;overflow:hidden;` +
    `box-shadow:0 2px 8px rgba(0,0,0,0.35);background:${color};` +
    `display:flex;align-items:center;justify-content:center">${houseSvg}</div>` +
    `<div style="height:3px;background:${color};border-left:2px solid white;border-right:2px solid white"></div>` +
    `<div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;` +
    `border-left:5px solid transparent;border-right:5px solid transparent;` +
    `border-top:7px solid ${color}"></div>` +
    starBadge +
    `</div>`;

  return L.divIcon({ html, className: '', iconSize: [W, totalH], iconAnchor: [W / 2, totalH] });
}

export function makeThumbnailVietaIcon(url, isSelected, zvaigzdute, statusas, saltinis, hasInfo) {
  const statusColors = { nuvaziuoti: '#1a73e8', aplankyta: '#137333', atmesta: '#c5221f' };
  const statusColor = statusColors[statusas] ?? ((hasInfo || saltinis === 'skelbimas') ? '#e37400' : '#c4c7cc');
  const size = isSelected ? 64 : 54;
  const totalH = size + 14; // 5px strip + 9px triangle
  const safe = url.replace(/'/g, '%27');
  // Selection shown as blue outer ring — status colour always preserved
  const shadow = isSelected
    ? `0 0 0 3px #1a73e8, 0 0 0 5px white, 0 4px 16px rgba(0,0,0,0.5)`
    : '0 3px 16px rgba(0,0,0,0.45)';
  const starBadge = zvaigzdute
    ? `<div style="position:absolute;top:-6px;left:-6px;width:20px;height:20px;border-radius:50%;` +
      `background:#fbbf24;border:2px solid white;text-align:center;line-height:16px;font-size:11px;color:white;` +
      `box-shadow:0 1px 4px rgba(0,0,0,0.35)">★</div>`
    : '';
  const html =
    `<div style="position:relative;width:${size}px;height:${totalH}px">` +
    // Photo card — white border top/left/right, open bottom
    `<div style="width:${size}px;height:${size}px;border-radius:10px 10px 0 0;overflow:hidden;` +
    `box-sizing:border-box;border:2px solid white;border-bottom:none;` +
    `box-shadow:${shadow};background:#ccc url('${safe}') center/cover no-repeat"></div>` +
    // Coloured status strip
    `<div style="height:5px;background:${statusColor};` +
    `border-left:2px solid white;border-right:2px solid white"></div>` +
    // Triangle pointer
    `<div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;` +
    `border-left:7px solid transparent;border-right:7px solid transparent;` +
    `border-top:9px solid ${statusColor}"></div>` +
    starBadge +
    `</div>`;
  return L.divIcon({ html, className: '', iconSize: [size, totalH], iconAnchor: [size / 2, totalH] });
}

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});
