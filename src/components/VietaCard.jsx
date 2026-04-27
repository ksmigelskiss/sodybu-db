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

  const meta = [
    vieta.kaina ? `${vieta.kaina.toLocaleString('lt-LT')} €` : null,
    ...activeAttrs.map(a => a.label),
  ].filter(Boolean).join(' · ');

  return (
    <div onClick={onClick} style={{
      padding: '6px 12px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
      background: selected ? '#f0f7ff' : !vieta.lat ? '#fffbeb' : vieta.statusas === 'nuvaziuoti' ? '#f0fdf4' : 'white',
      borderLeft: `3px solid ${selected ? '#2563eb' : th.color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          {vieta.lat ? (
            <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
              {apskritisLabel(vieta.lat, vieta.lng)} apskr.
              <span style={{ fontWeight: 400, fontSize: 11, color: '#9ca3af', marginLeft: 5 }}>
                {vieta.lat.toFixed(3)}, {vieta.lng.toFixed(3)}
              </span>
            </span>
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

      {(meta || vieta.komentaras) && (
        <div style={{ marginTop: 2, fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {meta && <span style={{ fontWeight: vieta.kaina ? 600 : 400, color: vieta.kaina ? '#92400e' : '#6b7280' }}>{meta}</span>}
          {meta && vieta.komentaras && <span style={{ color: '#d1d5db' }}> · </span>}
          {vieta.komentaras && <span style={{ color: '#9ca3af' }}>{vieta.komentaras}</span>}
        </div>
      )}
    </div>
  );
}
