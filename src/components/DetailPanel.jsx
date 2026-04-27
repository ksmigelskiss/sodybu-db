import { useState } from 'react';
import { X, MapPin, Check, ExternalLink } from 'lucide-react';
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
      background: 'white', borderRadius: 12,
      boxShadow: '0 2px 10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
      width: 300, zIndex: 1000,
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f3f4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#202124', lineHeight: 1.3, flex: 1, marginRight: 8 }}>
            {s.pavadinimas || s.adresas || `${s.lat?.toFixed(4)}, ${s.lng?.toFixed(4)}`}
          </span>
          <button onClick={onClose} style={iconBtn}>
            <X size={16} color="#5f6368" />
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={saving} onClick={toggleZiureta} style={{
            flex: 1, padding: '8px', borderRadius: 8,
            border: `1px solid ${isZiureta ? '#34a853' : '#dadce0'}`,
            background: isZiureta ? '#e6f4ea' : 'white',
            color: isZiureta ? '#137333' : '#5f6368',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <Check size={13} />
            {isZiureta ? 'Žiūrėta' : 'Pažymėti žiūrėta'}
          </button>
          <button onClick={onAddVieta} style={{
            flex: 1, padding: '8px', borderRadius: 8,
            border: '1px solid #1a73e8', background: '#e8f0fe',
            color: '#1a73e8', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <MapPin size={13} />
            Pridėti sodybą
          </button>
        </div>

        <Row label="Tipas"         value={s.tipas ?? '—'} />
        <Row label="Pastatai (RC)" value={s.adresas_sk ?? '—'} />
        <Row label="Plotas"        value={s.plotas_ha != null ? `${s.plotas_ha} ha` : '—'} />

        <div style={{ display: 'flex', gap: 6 }}>
          <GeoLink href={geoportalUrl(s.lat, s.lng)} label="Geoportal" />
          <GeoLink href={`http://www.etomesto.com/map-europe_lithuania_topo-500/?y=${s.lat}&x=${s.lng}`} label="Etomesto" />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid #f1f3f4' }}>
      <span style={{ color: '#5f6368' }}>{label}</span>
      <span style={{ color: '#202124' }}>{value}</span>
    </div>
  );
}

function GeoLink({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      flex: 1, textAlign: 'center', background: '#f8f9fa', borderRadius: 8,
      padding: '7px', textDecoration: 'none', color: '#5f6368', fontSize: 11, fontWeight: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    }}>
      <ExternalLink size={11} />
      {label}
    </a>
  );
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
};
