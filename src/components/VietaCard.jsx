import { vietaTheme, VIETA_ATTRS } from '../lib/theme.js';

export default function VietaCard({ vieta, selected, onClick }) {
  const th = vietaTheme(vieta.statusas);
  const activeAttrs = VIETA_ATTRS.filter(a => vieta[a.key]);
  const isSkelbimas = vieta.saltinis === 'skelbimas';

  return (
    <div onClick={onClick} style={{
      padding: '10px 14px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
      background: selected ? '#f0f7ff' : 'white',
      borderLeft: `3px solid ${selected ? '#2563eb' : th.color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1, marginRight: 6 }}>
          {vieta.zonaPavadinimas || `${vieta.lat?.toFixed(4)}, ${vieta.lng?.toFixed(4)}`}
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
          {isSkelbimas && (
            <span style={{
              fontSize: 10, color: '#92400e', fontWeight: 700,
              background: '#fef3c7', borderRadius: 5, padding: '1px 5px',
            }}>S</span>
          )}
          <span style={{
            fontSize: 11, color: th.color, fontWeight: 600,
            background: th.bg, borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap',
          }}>{th.label}</span>
        </div>
      </div>
      {vieta.kaina && (
        <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 2 }}>
          {vieta.kaina.toLocaleString('lt-LT')} €
        </div>
      )}
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
