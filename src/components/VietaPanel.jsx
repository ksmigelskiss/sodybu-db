import { useState, useEffect } from 'react';
import { VIETA_KEYS, VIETA_THEME, VIETA_ATTRS, vietaTheme } from '../lib/theme.js';
import { geoportalUrl } from '../lib/coords.js';

export default function VietaPanel({ vieta, onClose, onUpdate, onDelete, onLocate, mobile }) {
  const [komentaras, setKomentaras] = useState(vieta.komentaras || '');
  const [saving, setSaving]         = useState(false);
  const [ogImage, setOgImage]       = useState(null);

  useEffect(() => { setKomentaras(vieta.komentaras || ''); }, [vieta.id]);

  useEffect(() => {
    if (!vieta.url) { setOgImage(null); return; }
    setOgImage(null);
    fetch(`/api/og-fetch?url=${encodeURIComponent(vieta.url)}`)
      .then(r => r.json())
      .then(d => setOgImage(d.image ?? null))
      .catch(() => {});
  }, [vieta.url]);

  const th = vietaTheme(vieta.statusas);
  const isSkelbimas = vieta.saltinis === 'skelbimas';

  const handleStatus = async (key) => {
    const next = vieta.statusas === key ? null : key;
    setSaving(true);
    await onUpdate(vieta.id, { statusas: next });
    setSaving(false);
  };

  const toggleAttr = (key) => onUpdate(vieta.id, { [key]: !vieta[key] });

  const saveComment = () => onUpdate(vieta.id, { komentaras: komentaras || null });

  const containerStyle = mobile ? {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'white', borderRadius: '16px 16px 0 0',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
    padding: '16px 20px 32px', zIndex: 1100, maxHeight: '80vh', overflowY: 'auto',
  } : {
    position: 'absolute', bottom: 16, right: 16,
    background: 'white', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    padding: 20, width: 300, zIndex: 1000,
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            {vieta.zonaPavadinimas || `${vieta.lat?.toFixed(4)}, ${vieta.lng?.toFixed(4)}`}
          </span>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
            <span style={{
              fontSize: 11, color: th.color, fontWeight: 600,
              background: th.bg, borderRadius: 6, padding: '2px 6px',
            }}>{th.label}</span>
            {isSkelbimas && (
              <span style={{
                fontSize: 11, color: '#92400e', fontWeight: 600,
                background: '#fef3c7', borderRadius: 6, padding: '2px 6px',
              }}>📢 Skelbimas</span>
            )}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>×</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: vieta.lat ? 10 : 6 }}>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          {vieta.lat ? `${vieta.lat.toFixed(5)}, ${vieta.lng.toFixed(5)}` : '📍 Vieta nepridėta'}
        </span>
        <button onClick={() => onLocate?.(vieta)} style={{
          padding: '2px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600,
          border: '1.5px solid #d1d5db', background: 'none', color: '#6b7280',
        }}>
          {vieta.lat ? '📍 Perkelti' : '📍 Žymėti'}
        </button>
      </div>

      {/* Skelbimas info */}
      {isSkelbimas && (vieta.url || vieta.kaina) && (
        <div style={{ marginBottom: 10, borderRadius: 8, border: '1px solid #fde68a', overflow: 'hidden' }}>
          {ogImage && (
            <img src={ogImage} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ padding: '8px 10px', background: '#fffbeb' }}>
            {vieta.kaina && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: vieta.url ? 4 : 0 }}>
                {vieta.kaina.toLocaleString('lt-LT')} €
              </div>
            )}
            {vieta.url && (
              <a href={vieta.url} target="_blank" rel="noreferrer" style={{
                fontSize: 12, color: '#2563eb', textDecoration: 'none', wordBreak: 'break-all',
              }}>🔗 Atidaryti skelbimą</a>
            )}
          </div>
        </div>
      )}

      {/* Statusas */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {VIETA_KEYS.map(key => {
          const t = VIETA_THEME[key];
          const active = vieta.statusas === key;
          return (
            <button key={key} disabled={saving} onClick={() => handleStatus(key)} style={{
              flex: 1, padding: '6px 4px', borderRadius: 8,
              cursor: 'pointer', fontSize: 11, fontWeight: 600,
              border: `1.5px solid ${active ? t.color : '#e2e8f0'}`,
              background: active ? t.bg : '#f8fafc',
              color: active ? t.color : '#374151',
            }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Attrs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {VIETA_ATTRS.map(({ key, label }) => (
          <button key={key} onClick={() => toggleAttr(key)} style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            border: `1.5px solid ${vieta[key] ? '#2563eb' : '#e2e8f0'}`,
            background: vieta[key] ? '#dbeafe' : '#f8fafc',
            color: vieta[key] ? '#1d4ed8' : '#6b7280',
            fontWeight: vieta[key] ? 600 : 400,
          }}>
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={komentaras}
        onChange={e => setKomentaras(e.target.value)}
        onBlur={saveComment}
        placeholder="Komentaras..."
        rows={2}
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'vertical',
          border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px',
          fontSize: 12, fontFamily: 'inherit', marginBottom: 10, color: '#374151',
        }}
      />

      {vieta.lat && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {mobile ? (<>
            <GeoLink href={geoportalUrl(vieta.lat, vieta.lng)} icon="🗺" label="Geoportal" mini />
            <GeoLink href={`https://maps.google.com/?q=${vieta.lat},${vieta.lng}`} icon="📍" label="Google" mini />
            <GeoLink href={`http://www.etomesto.com/map-europe_lithuania_topo-500/?y=${vieta.lat}&x=${vieta.lng}`} icon="🗾" label="Etomesto" mini />
          </>) : (<>
            <GeoLink href={geoportalUrl(vieta.lat, vieta.lng)} icon="🗺" label="Geoportal" />
            <GeoLink href={`https://maps.google.com/?q=${vieta.lat},${vieta.lng}`} icon="📍" label="Google Maps" />
            <GeoLink href={`http://www.etomesto.com/map-europe_lithuania_topo-500/?y=${vieta.lat}&x=${vieta.lng}`} icon="🗾" label="Etomesto" />
          </>)}
        </div>
      )}

      <button
        onClick={() => { if (window.confirm('Ištrinti šią sodybą?')) onDelete(vieta.id); }}
        style={{
          width: '100%', padding: '7px', borderRadius: 8,
          border: '1.5px solid #fca5a5', background: '#fef2f2',
          color: '#dc2626', fontSize: 12, cursor: 'pointer',
        }}
      >
        🗑 Ištrinti
      </button>
    </div>
  );
}

function GeoLink({ href, icon, label, mini }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8,
      padding: mini ? '8px 4px' : '7px', textDecoration: 'none', color: '#374151',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    }}>
      <span style={{ fontSize: mini ? 20 : 14 }}>{icon}</span>
      <span style={{ fontSize: mini ? 9 : 11, fontWeight: 500, color: mini ? '#9ca3af' : '#374151' }}>{label}</span>
    </a>
  );
}
