import { vietaTheme, VIETA_ATTRS } from '../lib/theme.js';
import { APSKRITYS } from '../lib/apskritys.js';
import { MapPin } from 'lucide-react';

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
    vieta.komentaras,
  ].filter(Boolean).join(' · ');

  return (
    <div
      onClick={onClick}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f8f9fa'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'white'; }}
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid #f1f3f4',
        cursor: 'pointer',
        background: selected ? '#e8f0fe' : 'white',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}
    >
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: th.color, marginTop: 4, flexShrink: 0,
      }} />

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontWeight: 500, fontSize: 13, color: '#202124', lineHeight: 1.3 }}>
            {vieta.lat
              ? `${apskritisLabel(vieta.lat, vieta.lng)} apskr.`
              : <span style={{ color: '#e37400', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> Vieta nepridėta</span>
            }
          </span>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
            {isSkelbimas && (
              <span style={{ fontSize: 10, color: '#e37400', fontWeight: 700, background: '#fef3c7', borderRadius: 4, padding: '1px 5px' }}>S</span>
            )}
            <span style={{ fontSize: 11, color: th.color, fontWeight: 500, background: th.bg, borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>
              {th.label}
            </span>
          </div>
        </div>

        {vieta.lat && (
          <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 1 }}>
            {vieta.lat.toFixed(3)}, {vieta.lng.toFixed(3)}
          </div>
        )}

        {meta && (
          <div style={{ fontSize: 11, color: '#5f6368', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}
