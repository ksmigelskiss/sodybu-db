// Simplified Lithuania border outline (clockwise, ~20 key points)
const LT_OUTLINE = [
  [55.72, 21.10], // Klaipėda coast
  [56.40, 22.00], // North border west
  [56.45, 23.50], // North center
  [56.45, 25.00], // North east
  [56.40, 26.65], // NE corner (Latvia)
  [55.90, 26.82], // East border
  [55.30, 26.75], // East
  [54.65, 25.80], // SE
  [54.15, 25.50], // South-east
  [53.90, 25.00], // South
  [53.90, 24.35], // South
  [54.05, 23.50], // SW area
  [54.15, 23.00], // Near Kaliningrad
  [54.30, 22.73], // SW corner
  [54.38, 22.00], // West near Kaliningrad
  [54.55, 21.30], // West coast approach
  [55.28, 21.05], // West coast
  [55.65, 21.08], // Coast south of Klaipėda
  [55.72, 21.10], // close
];

const MIN_LAT = 53.80, MAX_LAT = 56.55;
const MIN_LNG = 20.90, MAX_LNG = 27.10;
const W = 138, H = 100, P = 7;

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
