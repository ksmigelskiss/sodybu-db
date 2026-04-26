import { useState } from 'react';
import { geoportalUrl } from '../lib/coords.js';

export default function DetailPanel({ sodyba: s, onClose, onStatusChange, onAddVieta }) {
  const [saving, setSaving] = useState(false);
  const isZiureta = s.statusas != null;

  const toggleZiureta = async () => {
    setSaving(true);
    await onStatusChange(s.id, isZiureta ? null : 'ziureta', s.komentaras ?? null);
    setSaving(false);
  };

  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16,
      background: 'white', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      padding: 20, width: 290, zIndex: 1000,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          {s.pavadinimas || s.adresas || `${s.lat?.toFixed(4)}, ${s.lng?.toFixed(4)}`}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>×</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button disabled={saving} onClick={toggleZiureta} style={{
          flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid',
          borderColor: isZiureta ? '#10b981' : '#e2e8f0',
          background: isZiureta ? '#d1fae5' : '#f8fafc',
          color: isZiureta ? '#065f46' : '#374151',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          {isZiureta ? '✓ Žiūrėta' : 'Pažymėti žiūrėta'}
        </button>
        <button onClick={onAddVieta} style={{
          flex: 1, padding: '8px', borderRadius: 8,
          border: '1.5px solid #2563eb', background: '#dbeafe',
          color: '#1d4ed8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          📍 Pridėti sodybą
        </button>
      </div>

      <Row label="Tipas"          value={s.tipas ?? '—'} />
      <Row label="Pastatai (RC)"  value={s.adresas_sk ?? '—'} />
      <Row label="Plotas"         value={s.plotas_ha != null ? `${s.plotas_ha} ha` : '—'} />

      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <a href={geoportalUrl(s.lat, s.lng)} target="_blank" rel="noreferrer"
          style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '7px', fontSize: 12, textDecoration: 'none', color: '#374151' }}>
          🗺 Geoportal
        </a>
        <a href={`https://maps.google.com/?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer"
          style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '7px', fontSize: 12, textDecoration: 'none', color: '#374151' }}>
          📍 Google Maps
        </a>
        <a href={`http://www.etomesto.com/map-europe_lithuania_topo-500/?y=${s.lat}&x=${s.lng}`} target="_blank" rel="noreferrer"
          style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '7px', fontSize: 12, textDecoration: 'none', color: '#374151' }}>
          🗾 Etomesto
        </a>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}
