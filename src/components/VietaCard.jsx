import { vietaTheme, VIETA_ATTRS } from '../lib/theme.js';
import { APSKRITYS } from '../lib/apskritys.js';

function apskritisLabel(lat, lng) {
  let best = null, bestDist = Infinity;
  for (const a of APSKRITYS) {
    const d = (lat - a.lat) ** 2 + ((lng - a.lng) * 0.6) ** 2;
    if (d < bestDist) { bestDist = d; best = a; }
  }
  return best?.label ?? '—';
}

export default function VietaCard({ vieta, selected, onClick }) {
  const th = vietaTheme(vieta.statusas);
  const activeAttrs = VIETA_ATTRS.filter(a => vieta[a.key]);
  const isSkelbimas = vieta.saltinis === 'skelbimas';

  return (
    <div onClick={onClick} style={{
      padding: '8px 12px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
      background: selected ? '#f0f7ff' : !vieta.lat ? '#fffbeb' : 'white',
      borderLeft: `3px solid ${selected ? '#2563eb' : th.color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {vieta.lat ? (
            <>
              <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                {apskritisLabel(vieta.lat, vieta.lng)} apskr.
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>
                {vieta.lat.toFixed(3)}, {vieta.lng.toFixed(3)}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>📍 Vieta nepridėta</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {isSkelbimas && (
            <span style={{ fontSize: 10, color: '#92400e', fontWeight: 700, background: '#fef3c7', borderRadius: 5, padding: '1px 5px' }}>S</span>
          )}
          <span style={{ fontSize: 11, color: th.color, fontWeight: 600, background: th.bg, borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' }}>
            {th.label}
          </span>
        </div>
      </div>

      {(vieta.kaina || activeAttrs.length > 0 || vieta.komentaras) && (
        <div style={{ marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {vieta.kaina && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
              {vieta.kaina.toLocaleString('lt-LT')} €
            </span>
          )}
          {activeAttrs.map(a => (
            <span key={a.key} style={{ fontSize: 11, color: '#6b7280' }}>{a.label}</span>
          ))}
          {vieta.komentaras && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{vieta.komentaras}</span>
          )}
        </div>
      )}
    </div>
  );
}
