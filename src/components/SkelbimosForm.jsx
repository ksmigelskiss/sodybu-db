import { useState } from 'react';
import { VIETA_ATTRS } from '../lib/theme.js';

export default function SkelbimosForm({ onSave, onCancel, mobile }) {
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
        saltinis: 'skelbimas',
        url: url.trim() || null,
        kaina: kaina ? Number(kaina) : null,
        komentaras: komentaras || null,
        lat: null,
        lng: null,
        statusas: null,
        ...attrs,
      });
    } catch (e) {
      alert('Klaida: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const style = mobile
    ? { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '16px 16px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.2)', padding: '16px 20px 32px', zIndex: 2000, maxHeight: '85vh', overflowY: 'auto' }
    : { position: 'absolute', bottom: 16, right: 16, background: 'white', borderRadius: 12, boxShadow: '0 4px 32px rgba(0,0,0,0.2)', padding: 20, width: 300, zIndex: 2000 };

  return (
    <div style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>📢 Pridėti skelbimą</span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>×</button>
      </div>

      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Nuoroda į skelbimą..."
        autoFocus
        style={{
          width: '100%', boxSizing: 'border-box', marginBottom: 8,
          border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px',
          fontSize: 13, fontFamily: 'inherit', color: '#374151',
        }}
      />

      <input
        value={kaina}
        onChange={e => setKaina(e.target.value.replace(/\D/g, ''))}
        placeholder="Kaina €"
        style={{
          width: '100%', boxSizing: 'border-box', marginBottom: 10,
          border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px',
          fontSize: 13, fontFamily: 'inherit', color: '#374151',
        }}
      />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {VIETA_ATTRS.map(({ key, label }) => (
          <button key={key} onClick={() => toggleAttr(key)} style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            border: `1.5px solid ${attrs[key] ? '#2563eb' : '#e2e8f0'}`,
            background: attrs[key] ? '#dbeafe' : '#f8fafc',
            color: attrs[key] ? '#1d4ed8' : '#6b7280',
            fontWeight: attrs[key] ? 600 : 400,
          }}>{label}</button>
        ))}
      </div>

      <textarea
        value={komentaras}
        onChange={e => setKomentaras(e.target.value)}
        placeholder="Komentaras..."
        rows={2}
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'none', marginBottom: 12,
          border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px',
          fontSize: 12, fontFamily: 'inherit', color: '#374151',
        }}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '8px', borderRadius: 8,
          border: '1.5px solid #e2e8f0', background: '#f8fafc',
          color: '#374151', fontSize: 13, cursor: 'pointer',
        }}>Atšaukti</button>
        <button onClick={handleSave} disabled={saving} style={{
          flex: 2, padding: '8px', borderRadius: 8, border: 'none',
          background: '#2563eb', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Saugoma...' : '💾 Išsaugoti'}
        </button>
      </div>
    </div>
  );
}
