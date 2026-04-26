import { VIETA_THEME, VIETA_ATTRS } from '../lib/theme.js';

export default function VietaCard({ vieta, selected, onClick }) {
  const th = VIETA_THEME[vieta.statusas] ?? VIETA_THEME.nauja;
  const activeAttrs = VIETA_ATTRS.filter(a => vieta[a.key]);

  return (
    <div onClick={onClick} style={{
      padding: '10px 14px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
      background: selected ? '#f0f7ff' : 'white',
      borderLeft: `3px solid ${selected ? '#2563eb' : th.color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          {vieta.zonaPavadinimas || `${vieta.lat?.toFixed(4)}, ${vieta.lng?.toFixed(4)}`}
        </span>
        <span style={{
          fontSize: 11, color: th.color, fontWeight: 600,
          background: th.bg, borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap',
        }}>
          {th.label}
        </span>
      </div>
      {activeAttrs.length > 0 && (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, display: 'flex', gap: 6 }}>
          {activeAttrs.map(a => <span key={a.key}>{a.label}</span>)}
        </div>
      )}
      {vieta.komentaras && (
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{vieta.komentaras}</div>
      )}
    </div>
  );
}
