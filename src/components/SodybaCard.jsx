import { STATUS_THEME } from '../lib/theme.js';
import { Check } from 'lucide-react';

export default function SodybaCard({ sodyba: s, onClick, selected }) {
  const th = STATUS_THEME[s.statusas];
  const isViewed = s.statusas !== null && s.statusas !== undefined;

  return (
    <div
      onClick={onClick}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f8f9fa'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = selected ? '#e8f0fe' : 'white'; }}
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid #f1f3f4',
        cursor: 'pointer',
        background: selected ? '#e8f0fe' : 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13, color: '#202124', display: 'flex', alignItems: 'center', gap: 5 }}>
          {isViewed && <Check size={12} color="#137333" strokeWidth={3} />}
          {s.pavadinimas || s.adresas || s.savivaldybe || `${s.lat?.toFixed(4)}, ${s.lng?.toFixed(4)}`}
        </div>
        {s.pastato_metai && (
          <div style={{ fontSize: 11, color: '#5f6368', marginTop: 2 }}>{s.pastato_metai}</div>
        )}
      </div>
      <ScoreBadge score={s.score} />
    </div>
  );
}

function ScoreBadge({ score }) {
  if (score == null) return null;
  const color = score >= 70 ? '#137333' : score >= 40 ? '#e37400' : '#5f6368';
  const bg    = score >= 70 ? '#e6f4ea' : score >= 40 ? '#fef3c7' : '#f1f3f4';
  return (
    <div style={{ background: bg, color, borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
      {score}
    </div>
  );
}
