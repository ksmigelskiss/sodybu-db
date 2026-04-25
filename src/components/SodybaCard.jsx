export default function SodybaCard({ sodyba, onClick, selected }) {
  const s = sodyba;
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid #eee',
        cursor: 'pointer',
        background: selected ? '#f0f7ff' : 'white',
        borderLeft: selected ? '3px solid #2563eb' : '3px solid transparent',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {s.pavadinimas || s.adresas || s.savivaldybe || `${s.lat?.toFixed(4)}, ${s.lng?.toFixed(4)}`}
        </div>
        <ScoreBadge score={s.score} />
      </div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 4, display: 'flex', gap: 8 }}>
        {s.miskas_m === 0 && <Tag icon="🌲" label="miškas" />}
        {s.upelis_m === 0 && <Tag icon="💧" label="upė" />}
        {s.kaimynai_200m === 0 && <Tag icon="🏡" label="vienkiemis" />}
        {s.kultura_paveldas && <Tag icon="🏛" label="paveldas" />}
        {s.saugomos_terit && <Tag icon="🌿" label="saugoma" />}
        {s.pastato_metai && <Tag icon="📅" label={s.pastato_metai} />}
      </div>
    </div>
  );
}

function ScoreBadge({ score }) {
  if (score == null) return null;
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#6b7280';
  return (
    <div style={{
      background: color, color: 'white',
      borderRadius: 12, padding: '2px 8px', fontSize: 13, fontWeight: 700,
    }}>
      {score}
    </div>
  );
}

function Tag({ icon, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {icon} {label}
    </span>
  );
}
