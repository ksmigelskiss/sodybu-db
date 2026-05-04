import { useState } from 'react';
import { MapPin, Link, Euro, ExternalLink, Droplets, Waves, Apple, Trees } from 'lucide-react';
import { VIETA_ATTRS } from '../lib/theme.js';
import { geoportalUrl } from '../lib/coords.js';

const ATTR_ICONS = { upelis: Droplets, tvenkinys: Waves, sodas: Apple, medziai: Trees };

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

  const wrap = mobile ? {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'white', borderRadius: '16px 16px 0 0',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.14)',
    zIndex: 2000, maxHeight: '85dvh', overflowY: 'auto',
    display: 'flex', flexDirection: 'column',
  } : {
    position: 'absolute', bottom: 16, right: 16,
    background: 'white', borderRadius: 14,
    boxShadow: '0 4px 20px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)',
    width: 348, zIndex: 2000,
    display: 'flex', flexDirection: 'column',
  };

  return (
    <div style={wrap} className={mobile ? 'sheet-slide-up' : undefined}>
      {mobile && <div style={{ width: 36, height: 4, background: '#dadce0', borderRadius: 2, margin: '10px auto 4px', flexShrink: 0 }} />}

      {/* Header */}
      <div style={{ padding: mobile ? '6px 14px 10px' : '14px 14px 10px', borderBottom: '1px solid #f1f3f4', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#202124', lineHeight: 1.25, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={14} color="#1a73e8" />
          {zonaPavadinimas || 'Nauja sodyba'}
        </div>
        <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 4 }}>
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Source selector — styled like status buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[['zona', 'Rasta žemėlapyje'], ['skelbimas', 'Skelbimas']].map(([key, label]) => {
            const active = saltinis === key;
            return (
              <button key={key} onClick={() => setSaltinis(key)} style={{
                flex: 1, height: 38, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${active ? '#1a73e8' : '#e8eaed'}`,
                background: active ? '#e8f0fe' : '#fafafa',
                color: active ? '#1a73e8' : '#5f6368',
                transition: 'all 0.12s',
              }}>{label}</button>
            );
          })}
        </div>

        {/* Skelbimas fields */}
        {saltinis === 'skelbimas' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e8eaed', borderRadius: 8, padding: '0 10px', background: 'white' }}>
              <Link size={12} color="#c4c7cc" />
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Nuoroda į skelbimą…" style={inlineInput} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e8eaed', borderRadius: 8, padding: '0 10px', background: 'white' }}>
              <Euro size={12} color="#c4c7cc" />
              <input value={kaina} onChange={e => setKaina(e.target.value.replace(/\D/g, ''))} placeholder="Kaina" style={inlineInput} />
            </div>
          </>
        )}

        {/* Nature attrs — 2×2 grid, same as VietaPanel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {VIETA_ATTRS.map(({ key, label }) => {
            const Icon = ATTR_ICONS[key];
            const active = !!attrs[key];
            return (
              <button key={key} onClick={() => toggleAttr(key)} style={{
                padding: '6px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: `1.5px solid ${active ? '#1a73e8' : '#e8eaed'}`,
                background: active ? '#e8f0fe' : '#fafafa',
                color: active ? '#1a73e8' : '#5f6368',
                fontWeight: active ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'all 0.12s',
              }}>
                {Icon && <Icon size={12} />}{label}
              </button>
            );
          })}
        </div>

        {/* Comment */}
        <textarea
          value={komentaras}
          onChange={e => setKomentaras(e.target.value)}
          placeholder="Komentaras…"
          rows={2}
          style={{ ...inlineInput, resize: 'vertical', padding: '8px 10px', lineHeight: 1.5, borderRadius: 8, border: '1px solid #e8eaed', width: '100%' }}
        />

        {/* Geo links */}
        <div style={{ display: 'flex', gap: 6 }}>
          <GeoLink href={geoportalUrl(lat, lng)} label="Geoportal" />
          <GeoLink href={`http://www.etomesto.com/map-europe_lithuania_topo-500/?y=${lat}&x=${lng}`} label="Etomesto" />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px', borderRadius: 10,
            border: '1px solid #e8eaed', background: 'white', color: '#5f6368', fontSize: 13, cursor: 'pointer', fontWeight: 500,
          }}>Atšaukti</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: '10px', borderRadius: 10, border: 'none',
            background: '#1a73e8', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            opacity: saving ? 0.7 : 1, letterSpacing: '0.1px',
          }}>
            {saving ? 'Saugoma…' : 'Išsaugoti'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GeoLink({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      flex: 1, textAlign: 'center', background: '#f8f9fa', borderRadius: 8,
      padding: '6px 4px', textDecoration: 'none', color: '#5f6368', fontSize: 11, fontWeight: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    }}>
      <ExternalLink size={10} />{label}
    </a>
  );
}

const inlineInput = {
  flex: 1, border: 'none', outline: 'none', background: 'transparent',
  fontSize: 13, color: '#202124', padding: '8px 0',
  fontFamily: 'system-ui, sans-serif', width: '100%', boxSizing: 'border-box',
};
