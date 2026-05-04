import { House } from 'lucide-react';
import { vietaTheme, VIETA_ATTRS } from '../lib/theme.js';
import { APSKRITYS } from '../lib/apskritys.js';

function apskritisLabel(lat, lng) {
  if (!lat) return null;
  let best = null, bestDist = Infinity;
  for (const a of APSKRITYS) {
    const d = (lat - a.lat) ** 2 + ((lng - a.lng) * 0.6) ** 2;
    if (d < bestDist) { bestDist = d; best = a; }
  }
  return best?.label ?? null;
}

export default function KortelesGrid({ vietos, selectedId, onSelect }) {
  if (vietos.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#9aa0a6', fontSize: 13 }}>
        Nėra atrinktų sodybų
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      padding: 8,
    }}>
      {vietos.map(v => <KortelesCard key={v.id} vieta={v} selected={selectedId === v.id} onClick={() => onSelect(v)} />)}
    </div>
  );
}

function KortelesCard({ vieta, selected, onClick }) {
  const th = vietaTheme(vieta.statusas);
  const cover = vieta.nuotraukos?.[0] ?? null;
  const hasLocation = !!(vieta.lat && vieta.lng);
  const label = hasLocation ? (apskritisLabel(vieta.lat, vieta.lng) ?? 'Lietuva') : null;
  const activeAttrs = VIETA_ATTRS.filter(a => vieta[a.key]).map(a => a.label);

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 10,
        border: `1.5px solid ${selected ? '#1a73e8' : '#e8eaed'}`,
        background: selected ? '#e8f0fe' : 'white',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: selected ? '0 0 0 2px #1a73e820' : '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Photo or placeholder */}
      <div style={{
        width: '100%', aspectRatio: '4/3',
        background: cover ? 'transparent' : '#f1f3f4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {cover
          ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <House size={28} color="#dadce0" />
        }
        {vieta.nuotraukos?.length > 1 && (
          <span style={{
            position: 'absolute', bottom: 4, right: 4,
            background: 'rgba(0,0,0,0.55)', color: 'white',
            fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '1px 5px',
          }}>
            +{vieta.nuotraukos.length - 1}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '7px 8px 8px' }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: '#202124', lineHeight: 1.3 }}>
          {vieta.zonaPavadinimas || (label ? `${label} apskr.` : '')}
        </div>
        {!hasLocation && (
          <div style={{ fontSize: 10, fontWeight: 600, color: '#e37400', marginTop: 2 }}>
            📍 Vieta nepridėta
          </div>
        )}

        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <span style={{
            fontSize: 10, fontWeight: 500, color: th.color, background: th.bg,
            borderRadius: 4, padding: '1px 5px',
          }}>
            {th.label}
          </span>
          {vieta.saltinis === 'skelbimas' && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#e37400', background: '#fef3c7',
              borderRadius: 4, padding: '1px 5px',
            }}>
              S
            </span>
          )}
        </div>

        {vieta.kaina && (
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e37400', marginTop: 3 }}>
            {vieta.kaina.toLocaleString('lt-LT')} €
          </div>
        )}

        {activeAttrs.length > 0 && (
          <div style={{ fontSize: 10, color: '#5f6368', marginTop: 3 }}>
            {activeAttrs.join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}
