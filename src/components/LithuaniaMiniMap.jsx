// Lithuania border — clockwise from NW coast
const LT_OUTLINE = [
  [56.05, 21.07],  // Palanga / Latvia border start (coast)
  [56.18, 21.49],  // Latvia border →
  [56.25, 22.08],
  [56.39, 22.58],
  [56.45, 23.34],
  [56.45, 24.12],
  [56.44, 24.89],
  [56.40, 25.75],
  [56.39, 26.59],  // NE corner (LT-LV-BY tripoint)
  [55.76, 26.82],  // E border, Belarus ↓
  [55.09, 26.84],
  [54.83, 26.63],
  [54.64, 25.96],
  [54.16, 25.86],
  [53.91, 25.53],  // SE corner
  [53.89, 25.09],  // S border →
  [53.89, 24.36],
  [53.91, 23.97],  // Druskininkai
  [53.95, 23.48],  // Poland border starts
  [54.17, 22.97],  // Lazdijai
  [54.22, 22.83],  // Kaliningrad border starts
  [54.35, 22.38],
  [54.43, 22.07],
  [54.45, 21.62],
  [54.57, 21.27],  // Pagėgiai
  [54.82, 21.06],  // W coast ↑
  [55.07, 21.04],
  [55.35, 21.05],
  [55.70, 21.10],  // Klaipėda
  [56.05, 21.07],  // back to Palanga
];

const MIN_LAT = 53.85, MAX_LAT = 56.52;
const MIN_LNG = 21.00, MAX_LNG = 26.90;
const H = 100, P = 8;

// Proper projection: correct longitude for latitude (cos correction at ~55°N)
const COS_LAT = Math.cos(55.2 * Math.PI / 180); // ≈ 0.571
const SCALE = (H - 2 * P) / (MAX_LAT - MIN_LAT); // px per lat degree
const W = Math.round(2 * P + (MAX_LNG - MIN_LNG) * COS_LAT * SCALE); // ≈ 122

function proj(lat, lng) {
  const x = P + (lng - MIN_LNG) * COS_LAT * SCALE;
  const y = (H - P) - (lat - MIN_LAT) * SCALE;
  return [x, y];
}

export default function LithuaniaMiniMap({ lat, lng, topOffset = 12 }) {
  if (!lat || !lng) return null;

  const points = LT_OUTLINE.map(([la, lo]) => proj(la, lo).join(',')).join(' ');
  const [cx, cy] = proj(lat, lng);

  return (
    <div style={{
      position: 'absolute', top: topOffset, right: 12, zIndex: 900,
      background: 'white', borderRadius: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
      padding: '4px 4px 2px',
      pointerEvents: 'none',
    }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <polygon points={points} fill="#e8f0fe" stroke="#aec8f5" strokeWidth="1.2" />
        <circle cx={cx} cy={cy} r={8} fill="rgba(26,115,232,0.18)" />
        <circle cx={cx} cy={cy} r={4.5} fill="#1a73e8" stroke="white" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
