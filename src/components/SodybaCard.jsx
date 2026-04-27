import { STATUS_THEME } from '../lib/theme.js';

export default function SodybaCard({ sodyba: s, onClick, selected }) {
  const th = STATUS_THEME[s.statusas];
  const cardBg   = selected ? '#f0f7ff' : (th?.card?.bg   ?? 'white');
  const cardBorder = selected ? '#2563eb' : (th?.card?.border ?? 'transparent');

  return (
    <div onClick={onClick} style={{
      padding: '10px 14px', borderBottom: '1px solid #eee', cursor: 'pointer',
      background: cardBg, borderLeft: `3px solid ${cardBorder}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
          {s.statusas !== null && s.statusas !== undefined && <span style={{ fontSize: 12, color: '#16a34a' }}>✓</span>}
          {s.pavadinimas || s.adresas || s.savivaldybe || `${s.lat?.toFixed(4)}, ${s.lng?.toFixed(4)}`}
        </div>
        <ScoreBadge score={s.score} />
      </div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 4, display: 'flex', gap: 8 }}>
        {s.pastato_metai && <Tag icon="📅" label={s.pastato_metai} />}
      </div>
    </div>
  );
}

function ScoreBadge({ score }) {
  if (score == null) return null;
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#6b7280';
  return (
    <div style={{ background: color, color: 'white', borderRadius: 12, padding: '2px 8px', fontSize: 13, fontWeight: 700 }}>
      {score}
    </div>
  );
}

function Tag({ icon, label }) {
  return <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>{icon} {label}</span>;
}
