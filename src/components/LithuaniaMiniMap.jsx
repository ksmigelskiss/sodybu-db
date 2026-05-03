// Simplified Lithuania border — clockwise from Palanga (NW coast)
const LT_OUTLINE = [
  [56.05, 21.06],  // Palanga
  [56.21, 21.30],  // coast → Latvia
  [56.38, 21.75],  // Latvia border W
  [56.41, 22.50],  // Latvia border
  [56.45, 23.40],  // Latvia border, Joniškis
  [56.46, 24.10],  // Latvia border, Biržai
  [56.45, 24.80],  // Latvia border E
  [56.40, 26.59],  // NE corner
  [55.85, 26.82],  // E border
  [55.20, 26.80],  // E border
  [54.70, 25.90],  // E border SW
  [54.25, 25.75],  // Eišiškės area
  [53.91, 25.53],  // SE corner
  [53.89, 24.75],  // S border
  [53.90, 24.00],  // S, Druskininkai
  [53.96, 23.48],  // S, Seinai
  [54.22, 22.83],  // Lazdijai, Kaliningrad border starts
  [54.35, 22.37],  // Kaliningrad border
  [54.43, 22.06],  // Kaliningrad border
  [54.45, 21.60],  // Kaliningrad border
  [54.57, 21.28],  // Šilutė area
  [54.75, 21.07],  // Coast S of Klaipėda
  [55.05, 21.04],  // Coast
  [55.35, 21.05],  // Coast
  [55.70, 21.10],  // Klaipėda
  [56.05, 21.06],  // back to Palanga
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
