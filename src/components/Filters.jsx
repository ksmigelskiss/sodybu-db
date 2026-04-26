import { useState } from 'react';
import { APSKRITYS_OPTIONS } from '../lib/apskritys.js';

const TIPAI = [
  { value: '', label: 'Visi' },
  { value: 'Viensėdis', label: '🏚 Viensėdis' },
  { value: 'Kaimas', label: '🏘 Kaimas' },
];

export default function Filters({ onApply }) {
  const [f, setF] = useState({
    apskritis: '',
    tipas: 'Viensėdis',
    maxAdresas: '',
    miskas: false,
    upelis: false,
    radiusKm: '',
  });

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #ddd', background: '#f9fafb' }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>

        <label style={labelStyle}>
          <span style={{ fontWeight: 600 }}>Apskritis</span>
          <select
            value={f.apskritis}
            onChange={e => set('apskritis', e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
          >
            {APSKRITYS_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>

        <label style={labelStyle}>
          <span style={{ fontWeight: 600 }}>Tipas</span>
          <select
            value={f.tipas}
            onChange={e => set('tipas', e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
          >
            {TIPAI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <label style={labelStyle}>
          <span>Max adresai</span>
          <input
            type="number" min={1} max={50} placeholder="visi"
            value={f.maxAdresas}
            onChange={e => set('maxAdresas', e.target.value)}
            style={{ width: 52, padding: '2px 6px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
          />
        </label>

        <Toggle label="🌲 Miškas" value={f.miskas} onChange={v => set('miskas', v)} />
        <Toggle label="💧 Upė/ežeras" value={f.upelis} onChange={v => set('upelis', v)} />

        <label style={labelStyle}>
          <span>Spindulys (km)</span>
          <input
            type="number" min={1} max={200} placeholder="visi"
            value={f.radiusKm}
            onChange={e => set('radiusKm', e.target.value)}
            style={{ width: 52, padding: '2px 6px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
          />
        </label>

        <button
          onClick={() => onApply(f)}
          style={{
            background: '#2563eb', color: 'white',
            border: 'none', borderRadius: 8,
            padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
          }}
        >
          Rodyti
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

const labelStyle = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151',
};
