import L from 'leaflet';

export const LAYERS = {
  map: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CARTO', maxZoom: 19, subdomains: 'abcd',
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

export function makeMarkerIcon(score) {
  const color = scoreColor(score);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="14" y="18" text-anchor="middle" font-size="10" font-weight="bold" fill="white">${score ?? '?'}</text>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
}

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});
