import { useState } from 'react';
import { VIETA_ATTRS } from '../lib/theme.js';
import { geoportalUrl } from '../lib/coords.js';

export default function VietaForm({ lat, lng, zonaPavadinimas, onSave, onCancel }) {
  const [saltinis, setSaltinis]     = useState('zona');
  const [url, setUrl]               = useState('');
  const [kaina, setKaina]           = useState('');
  const [komentaras, setKomentaras] = useState('');
  const [attrs, setAttrs]           = useState({});
  const [saving, setSaving]         = useState(false);

  const toggleAttr = (key) => setAttrs(a => ({ ...a, [key]: !a[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        lat, lng,
        statusas: null,
        saltinis,
        url: url.trim() || null,
        kaina: kaina ? Number(kaina) : null,
        komentaras,
        ...attrs,
      });
    } catch (e) {
      console.error('Klaida išsaugant:', e);
      alert('Klaida išsaugant: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      background: 'white', borderRadius: 12, boxShadow: '0 4px 32px rgba(0,0,0,0.25)',
      padding: 20, width: 300, zIndex: 2000,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>📍 Nauja sodyba</div>
      {zonaPavadinimas && (
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Zona: {zonaPavadinimas}</div>
      )}
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </div>

      {/* Saltinis toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[['zona', '🗺 Rasta žemėlapyje'], ['skelbimas', '📢 Skelbimas']].map(([key, label]) => (
          <button key={key} onClick={() => setSaltinis(key)} style={{
            flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            border: `1.5px solid ${saltinis === key ? '#2563eb' : '#e2e8f0'}`,
            background: saltinis === key ? '#dbeafe' : '#f8fafc',
            color: saltinis === key ? '#1d4ed8' : '#6b7280',
          }}>{label}</button>
        ))}
      </div>

      {/* Skelbimas fields */}
      {saltinis === 'skelbimas' && (
        <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            value={url} onChange={e => setUrl(e.target.value)}
            placeholder="Nuoroda į skelbimą..."
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px',
              fontSize: 12, fontFamily: 'inherit', color: '#374151',
            }}
          />
          <input
            value={kaina} onChange={e => setKaina(e.target.value.replace(/\D/g, ''))}
            placeholder="Kaina €"
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px',
              fontSize: 12, fontFamily: 'inherit', color: '#374151',
            }}
          />
        </div>
      )}

      {/* Attrs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {VIETA_ATTRS.map(({ key, label }) => (
          <button key={key} onClick={() => toggleAttr(key)} style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            border: `1.5px solid ${attrs[key] ? '#2563eb' : '#e2e8f0'}`,
            background: attrs[key] ? '#dbeafe' : '#f8fafc',
            color: attrs[key] ? '#1d4ed8' : '#6b7280',
            fontWeight: attrs[key] ? 600 : 400,
          }}>
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={komentaras}
        onChange={e => setKomentaras(e.target.value)}
        placeholder="Komentaras..."
        rows={2}
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'none',
          border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px',
          fontSize: 12, fontFamily: 'inherit', marginBottom: 10, color: '#374151',
        }}
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <a href={geoportalUrl(lat, lng)} target="_blank" rel="noreferrer" style={{
          flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 7,
          padding: '5px', fontSize: 11, textDecoration: 'none', color: '#374151', fontWeight: 500,
        }}>🗺 Geoportal</a>
        <a href={`https://maps.google.com/?q=${lat},${lng}`} target="_blank" rel="noreferrer" style={{
          flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 7,
          padding: '5px', fontSize: 11, textDecoration: 'none', color: '#374151', fontWeight: 500,
        }}>📍 Google Maps</a>
        <a href={`http://www.etomesto.com/map-europe_lithuania_topo-500/?y=${lat}&x=${lng}`} target="_blank" rel="noreferrer" style={{
          flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 7,
          padding: '5px', fontSize: 11, textDecoration: 'none', color: '#374151', fontWeight: 500,
        }}>🗾 Etomesto</a>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '8px', borderRadius: 8,
          border: '1.5px solid #e2e8f0', background: '#f8fafc',
          color: '#374151', fontSize: 13, cursor: 'pointer',
        }}>Atšaukti</button>
        <button onClick={handleSave} disabled={saving} style={{
          flex: 2, padding: '8px', borderRadius: 8, border: 'none',
          background: '#2563eb', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          {saving ? 'Saugoma...' : '💾 Išsaugoti'}
        </button>
      </div>
    </div>
  );
}
