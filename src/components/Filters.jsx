import { useState } from 'react';

export default function Filters({ onApply }) {
  const [f, setF] = useState({
    minScore: 0,
    miskas: false,
    upelis: false,
    vienkiemis: false,
    radiusKm: '',
  });

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #ddd', background: '#f9fafb' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>Filtrai</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={labelStyle}>
          <span>Min. balas</span>
          <input
            type="range" min={0} max={100} step={5}
            value={f.minScore}
            onChange={e => set('minScore', Number(e.target.value))}
            style={{ width: 80 }}
          />
          <span style={{ fontWeight: 700, color: '#2563eb' }}>{f.minScore}</span>
        </label>

        <Toggle label="🌲 Miškas" value={f.miskas} onChange={v => set('miskas', v)} />
        <Toggle label="💧 Upė/ežeras" value={f.upelis} onChange={v => set('upelis', v)} />
        <Toggle label="🏡 Vienkiemis" value={f.vienkiemis} onChange={v => set('vienkiemis', v)} />

        <label style={labelStyle}>
          <span>Spindulys (km)</span>
          <input
            type="number" min={1} max={200} placeholder="50"
            value={f.radiusKm}
            onChange={e => set('radiusKm', e.target.value)}
            style={{ width: 56, padding: '2px 6px', borderRadius: 6, border: '1px solid #d1d5db' }}
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
      <input
        type="checkbox" checked={value}
        onChange={e => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

const labelStyle = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151',
};
