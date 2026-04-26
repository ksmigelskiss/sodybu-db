import { useState } from 'react';
import { statusBtnStyle, STATUSES } from '../lib/status.js';

export default function DetailPanel({ sodyba: s, onClose, onStatusChange }) {
  const [comment, setComment] = useState(s.komentaras || '');
  const [saving, setSaving] = useState(false);

  const handleStatus = async (target) => {
    setSaving(true);
    const next = s.statusas === target ? null : target;
    await onStatusChange(s.id, next, comment || null);
    setSaving(false);
  };

  const saveComment = async () => {
    setSaving(true);
    await onStatusChange(s.id, s.statusas ?? null, comment || null);
    setSaving(false);
  };

  const base = { flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, border: '1.5px solid' };

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

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {Object.entries(STATUSES).map(([key, st]) => (
          <button key={key} disabled={saving} onClick={() => handleStatus(key)}
            style={{ ...base, ...statusBtnStyle(s.statusas, key) }}>
            {st.label}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        onBlur={saveComment}
        placeholder="Komentaras..."
        rows={2}
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'vertical',
          border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px',
          fontSize: 12, fontFamily: 'inherit', marginBottom: 10, color: '#374151',
        }}
      />

      <Row label="Balas"         value={`${s.score ?? '—'} / 100`} bold />
      <Row label="Tipas"         value={s.tipas ?? '—'} />
      <Row label="Pastatai (RC)" value={s.adresas_sk ?? '—'} />
      <Row label="Plotas"        value={s.plotas_ha != null ? `${s.plotas_ha} ha` : '—'} />
      <Row label="Miškas"        value={s.miskas_m === 0 ? '✓ sklype' : s.miskas_m != null ? `${s.miskas_m} m` : '—'} />
      <Row label="Upė/ežeras"    value={s.upelis_m === 0 ? '✓ šalia' : s.upelis_m != null ? `${s.upelis_m} m` : '—'} />
      <Row label="Kaimynai 200m" value={s.kaimynai_200m ?? '—'} />
      <Row label="Natura 2000"   value={s.natura2000 ? '⚠️ taip' : 'ne'} />
      <Row label="Saugoma terit." value={s.saugomos_terit ? '🌿 taip' : 'ne'} />

      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <a href={`https://www.geoportal.lt/map/?lat=${s.lat}&lng=${s.lng}&zoom=15`} target="_blank" rel="noreferrer"
          style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '7px', fontSize: 12, textDecoration: 'none', color: '#374151' }}>
          🗺 Geoportal
        </a>
        <a href={`https://maps.google.com/?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer"
          style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '7px', fontSize: 12, textDecoration: 'none', color: '#374151' }}>
          📍 Google Maps
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
