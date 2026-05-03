// Lithuania border — clockwise from NW coast (Palanga/Salantas crossing)
// Calibrated against known city coordinates:
//   Vilnius   54.687°N 25.280°E  → should appear right-center-low
//   Kaunas    54.899°N 23.904°E  → center, slightly low
//   Klaipėda  55.703°N 21.144°E  → far left, upper-mid
//   Šiauliai  55.935°N 23.314°E  → center-left, upper
const LT_OUTLINE = [
  [56.05, 21.07],  // NW: Palanga coast / Latvia border start
  [56.18, 21.49],  // Latvia border →
  [56.28, 22.08],  // Latvia border, Skuodas area
  [56.43, 22.75],  // Latvia border
  [56.45, 23.44],  // Latvia border, Joniškis
  [56.45, 24.22],  // Latvia border, Biržai
  [56.44, 24.89],  // Latvia border E
  [56.40, 25.75],  // Latvia border, toward NE corner
  [56.39, 26.59],  // NE corner (LT-LV-BY tripoint)
  [55.80, 26.83],  // E border, Belarus ↓
  [55.18, 26.84],  // E border
  [54.84, 26.65],  // E border
  [54.63, 25.97],  // E border, curving SW
  [54.17, 25.85],  // E border, near Eišiškės
  [53.91, 25.54],  // SE corner
  [53.89, 25.08],  // S border, Belarus →
  [53.89, 24.36],  // S border
  [53.90, 23.97],  // S border, Druskininkai
  [53.95, 23.50],  // S border, Poland starts
  [54.17, 22.97],  // SW, Lazdijai / Poland border
  [54.22, 22.83],  // Kaliningrad border starts
  [54.35, 22.38],  // Kaliningrad border ↑
  [54.43, 22.07],  // Kaliningrad border
  [54.45, 21.62],  // Kaliningrad border
  [54.57, 21.27],  // Pagėgiai / Šilutė area
  [54.82, 21.06],  // W coast ↑
  [55.07, 21.04],  // W coast
  [55.35, 21.05],  // W coast
  [55.72, 21.10],  // Klaipėda
  [56.05, 21.07],  // back to Palanga
];

const MIN_LAT = 53.85, MAX_LAT = 56.52;
const MIN_LNG = 21.00, MAX_LNG = 26.90;
const W = 138, H = 100, P = 8;

function proj(lat, lng) {
  const x = P + (lng - MIN_LNG) / (MAX_LNG - MIN_LNG) * (W - 2 * P);
  const y = (H - P) - (lat - MIN_LAT) / (MAX_LAT - MIN_LAT) * (H - 2 * P);
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
