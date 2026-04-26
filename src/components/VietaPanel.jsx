import { useState } from 'react';
import { VIETA_THEME, VIETA_KEYS, VIETA_ATTRS } from '../lib/theme.js';

export default function VietaPanel({ vieta, onClose, onUpdate, onDelete }) {
  const [komentaras, setKomentaras] = useState(vieta.komentaras || '');
  const [saving, setSaving] = useState(false);

  const handleStatus = async (key) => {
    setSaving(true);
    await onUpdate(vieta.id, { statusas: key });
    setSaving(false);
  };

  const toggleAttr = async (key) => {
    await onUpdate(vieta.id, { [key]: !vieta[key] });
  };

  const saveComment = () => onUpdate(vieta.id, { komentaras: komentaras || null });

  const base = {
    flex: 1, padding: '6px 4px', borderRadius: 8,
    cursor: 'pointer', fontSize: 11, fontWeight: 600, border: '1.5px solid',
  };

  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16,
      background: 'white', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      padding: 20, width: 290, zIndex: 1000,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          {vieta.zonaPavadinimas || `${vieta.lat?.toFixed(4)}, ${vieta.lng?.toFixed(4)}`}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>×</button>
      </div>

      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
        {vieta.lat?.toFixed(5)}, {vieta.lng?.toFixed(5)}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {VIETA_KEYS.map(key => {
          const th = VIETA_THEME[key];
          const active = vieta.statusas === key;
          return (
            <button key={key} disabled={saving} onClick={() => handleStatus(key)} style={{
              ...base,
              background: active ? th.bg : '#f8fafc',
              borderColor: active ? th.color : '#e2e8f0',
              color: active ? th.color : '#374151',
            }}>
              {th.label}
            </button>
          );
        })}
      </div>

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <a href={`https://www.geoportal.lt/map/#zoom=17&lat=${vieta.lat}&lon=${vieta.lng}`}
          target="_blank" rel="noreferrer"
          style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '8px', fontSize: 12, textDecoration: 'none', color: '#374151', fontWeight: 500 }}>
          🗺 Geoportal
        </a>
        <a href={`https://maps.google.com/?q=${vieta.lat},${vieta.lng}`}
          target="_blank" rel="noreferrer"
          style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '8px', fontSize: 12, textDecoration: 'none', color: '#374151', fontWeight: 500 }}>
          📍 Google Maps
        </a>
      </div>

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
