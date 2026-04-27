import { useState } from 'react';

const TIPAI = [
  { value: '', label: 'Visi' },
  { value: 'Viensėdis', label: '🏚 Viensėdis' },
  { value: 'Kaimas', label: '🏘 Kaimas' },
];

export default function Filters({ onApply }) {
  const [f, setF] = useState({ tipas: 'Viensėdis', maxAdresas: '' });

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  return (
    <div style={{ padding: '8px 14px', borderBottom: '1px solid #ddd', background: '#f9fafb' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
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

const labelStyle = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151',
};
