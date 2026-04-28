import { useState } from 'react';
import { MapPin, Link, Euro, MessageSquare, ExternalLink } from 'lucide-react';
import { VIETA_ATTRS } from '../lib/theme.js';
import { geoportalUrl } from '../lib/coords.js';

const ATTR_ICONS_MAP = { upelis: '💧', tvenkinys: '🏊', sodas: '🍎', medziai: '🌳' };

export default function VietaForm({ lat, lng, zonaPavadinimas, onSave, onCancel, mobile }) {
  const [saltinis, setSaltinis] = useState('zona');
  const [url, setUrl]           = useState('');
  const [kaina, setKaina]       = useState('');
  const [komentaras, setKomentaras] = useState('');
  const [attrs, setAttrs]       = useState({});
  const [saving, setSaving]     = useState(false);

  const toggleAttr = (key) => setAttrs(a => ({ ...a, [key]: !a[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ lat, lng, statusas: null, saltinis, url: url.trim() || null, kaina: kaina ? Number(kaina) : null, komentaras, ...attrs });
    } catch (e) {
      alert('Klaida: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const style = mobile ? {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'white', borderRadius: '16px 16px 0 0',
    boxShadow: '0 -2px 16px rgba(0,0,0,0.12)',
    padding: '0 0 24px', zIndex: 2000, maxHeight: '85vh', overflowY: 'auto',
  } : {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    background: 'white', borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    padding: '0', width: 320, zIndex: 2000,
  };

  return (
    <div style={style} className={mobile ? 'sheet-slide-up' : undefined}>
      {mobile && <div style={{ width: 36, height: 4, background: '#dadce0', borderRadius: 2, margin: '10px auto 0' }} />}

      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1f3f4' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#202124', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={15} color="#1a73e8" /> Nauja sodyba
        </div>
        {zonaPavadinimas && <div style={{ fontSize: 12, color: '#5f6368' }}>{zonaPavadinimas}</div>}
        <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 2 }}>{lat.toFixed(5)}, {lng.toFixed(5)}</div>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Saltinis */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[['zona', 'Rasta žemėlapyje'], ['skelbimas', 'Skelbimas']].map(([key, label]) => (
            <button key={key} onClick={() => setSaltinis(key)} style={{
              flex: 1, padding: '7px 6px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              border: `1.5px solid ${saltinis === key ? '#1a73e8' : '#dadce0'}`,
              background: saltinis === key ? '#e8f0fe' : 'white',
              color: saltinis === key ? '#1a73e8' : '#5f6368',
            }}>{label}</button>
          ))}
        </div>

        {/* Skelbimas fields */}
        {saltinis === 'skelbimas' && (
          <>
            <div style={{ position: 'relative' }}>
              <Link size={13} color="#9aa0a6" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Nuoroda į skelbimą..." style={{ ...field, paddingLeft: 28 }} />
            </div>
            <div style={{ position: 'relative' }}>
              <Euro size={13} color="#9aa0a6" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input value={kaina} onChange={e => setKaina(e.target.value.replace(/\D/g, ''))} placeholder="Kaina" style={{ ...field, paddingLeft: 28 }} />
            </div>
          </>
        )}

        {/* Attrs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {VIETA_ATTRS.map(({ key, label }) => (
            <button key={key} onClick={() => toggleAttr(key)} style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              border: `1.5px solid ${attrs[key] ? '#1a73e8' : '#dadce0'}`,
              background: attrs[key] ? '#e8f0fe' : 'white',
              color: attrs[key] ? '#1a73e8' : '#5f6368',
              fontWeight: attrs[key] ? 600 : 400,
            }}>{label}</button>
          ))}
        </div>

        {/* Komentaras */}
        <div style={{ position: 'relative' }}>
          <MessageSquare size={13} color="#9aa0a6" style={{ position: 'absolute', left: 9, top: 10, pointerEvents: 'none' }} />
          <textarea value={komentaras} onChange={e => setKomentaras(e.target.value)} placeholder="Komentaras..." rows={2} style={{ ...field, paddingLeft: 28, width: '100%', resize: 'none' }} />
        </div>

        {/* Geo links */}
        <div style={{ display: 'flex', gap: 6 }}>
          <GeoLink href={geoportalUrl(lat, lng)} label="Geoportal" />
          <GeoLink href={`http://www.etomesto.com/map-europe_lithuania_topo-500/?y=${lat}&x=${lng}`} label="Etomesto" />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '9px', borderRadius: 8,
            border: '1px solid #dadce0', background: 'white', color: '#5f6368', fontSize: 13, cursor: 'pointer',
          }}>Atšaukti</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: '9px', borderRadius: 8, border: 'none',
            background: '#1a73e8', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saugoma...' : 'Išsaugoti'}
          </button>
        </div>
      </div>
    </div>
  );
}

const field = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #dadce0', borderRadius: 8, padding: '8px 10px',
  fontSize: 16, color: '#202124', background: 'white', outline: 'none',
};

function GeoLink({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      flex: 1, textAlign: 'center', background: '#f8f9fa', borderRadius: 8,
      padding: '7px', textDecoration: 'none', color: '#5f6368', fontSize: 11, fontWeight: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    }}>
      <ExternalLink size={11} />{label}
    </a>
  );
}
