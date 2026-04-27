import { useState, useEffect } from 'react';
import { VIETA_KEYS, VIETA_THEME, VIETA_ATTRS, vietaTheme } from '../lib/theme.js';
import { geoportalUrl } from '../lib/coords.js';

export default function VietaPanel({ vieta, onClose, onUpdate, onDelete, onLocate }) {
  const [komentaras, setKomentaras] = useState(vieta.komentaras || '');
  const [saving, setSaving]         = useState(false);

  useEffect(() => { setKomentaras(vieta.komentaras || ''); }, [vieta.id]);

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

  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16,
      background: 'white', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      padding: 20, width: 300, zIndex: 1000,
    }}>
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

      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: vieta.lat ? 10 : 6 }}>
        {vieta.lat ? `${vieta.lat.toFixed(5)}, ${vieta.lng.toFixed(5)}` : '📍 Vieta nepridėta'}
      </div>
      {!vieta.lat && (
        <button onClick={() => onLocate?.(vieta)} style={{
          width: '100%', marginBottom: 10, padding: '7px', borderRadius: 8,
          border: '1.5px solid #d97706', background: '#fef3c7',
          color: '#92400e', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          📍 Žymėti žemėlapyje
        </button>
      )}

      {/* Skelbimas info */}
      {isSkelbimas && (vieta.url || vieta.kaina) && (
        <div style={{ marginBottom: 10, padding: '8px 10px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
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
          <a href={geoportalUrl(vieta.lat, vieta.lng)} target="_blank" rel="noreferrer"
            style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '7px', fontSize: 11, textDecoration: 'none', color: '#374151', fontWeight: 500 }}>
            🗺 Geoportal
          </a>
          <a href={`https://maps.google.com/?q=${vieta.lat},${vieta.lng}`} target="_blank" rel="noreferrer"
            style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '7px', fontSize: 11, textDecoration: 'none', color: '#374151', fontWeight: 500 }}>
            📍 Google Maps
          </a>
          <a href={`http://www.etomesto.com/map-europe_lithuania_topo-500/?y=${vieta.lat}&x=${vieta.lng}`} target="_blank" rel="noreferrer"
            style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '7px', fontSize: 11, textDecoration: 'none', color: '#374151', fontWeight: 500 }}>
            🗾 Etomesto
          </a>
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
