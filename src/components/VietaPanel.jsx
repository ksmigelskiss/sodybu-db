import { useState, useEffect } from 'react';
import { X, MapPin, Trash2, Phone, User, ExternalLink, Car, Eye, XCircle, Droplets, Waves, Apple, Trees, Navigation } from 'lucide-react';
import { VIETA_KEYS, VIETA_THEME, VIETA_ATTRS, vietaTheme } from '../lib/theme.js';
import { geoportalUrl } from '../lib/coords.js';

const ATTR_ICONS = { upelis: Droplets, tvenkinys: Waves, sodas: Apple, medziai: Trees };
const STATUS_ICONS = { nuvaziuoti: Car, aplankyta: Eye, atmesta: XCircle };

export default function VietaPanel({ vieta, onClose, onUpdate, onDelete, onLocate, mobile }) {
  const [komentaras, setKomentaras] = useState(vieta.komentaras || '');
  const [vardas, setVardas]         = useState(vieta.vardas || '');
  const [tel, setTel]               = useState(vieta.tel || '');
  const [saving, setSaving]         = useState(false);
  const [ogImage, setOgImage]       = useState(null);

  useEffect(() => {
    setKomentaras(vieta.komentaras || '');
    setVardas(vieta.vardas || '');
    setTel(vieta.tel || '');
  }, [vieta.id]);

  useEffect(() => {
    if (!vieta.url) { setOgImage(null); return; }
    setOgImage(null);
    fetch(`/api/og-fetch?url=${encodeURIComponent(vieta.url)}`)
      .then(r => r.json())
      .then(d => setOgImage(d.image ?? null))
      .catch(() => {});
  }, [vieta.url]);

  const th = vietaTheme(vieta.statusas);
  const isSkelbimas = vieta.saltinis === 'skelbimas';

  const handleStatus = async (key) => {
    const next = vieta.statusas === key ? null : key;
    setSaving(true);
    await onUpdate(vieta.id, { statusas: next });
    setSaving(false);
  };

  const toggleAttr = (key) => onUpdate(vieta.id, { [key]: !vieta[key] });
  const save = (field, val) => onUpdate(vieta.id, { [field]: val || null });

  const containerStyle = mobile ? {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'white', borderRadius: '16px 16px 0 0',
    boxShadow: '0 -2px 16px rgba(0,0,0,0.12)',
    zIndex: 1200, maxHeight: '82vh', overflowY: 'auto',
  } : {
    position: 'absolute', bottom: 16, right: 16,
    background: 'white', borderRadius: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
    width: 340, zIndex: 1000, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
  };

  return (
    <div style={containerStyle}>
      {mobile && <div style={{ width: 36, height: 4, background: '#dadce0', borderRadius: 2, margin: '10px auto 0' }} />}

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f3f4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, marginRight: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#202124', lineHeight: 1.3 }}>
              {vieta.zonaPavadinimas || (vieta.lat ? `${vieta.lat.toFixed(4)}, ${vieta.lng.toFixed(4)}` : 'Be vietos')}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: th.color, fontWeight: 500, background: th.bg, borderRadius: 12, padding: '2px 8px' }}>
                {th.label}
              </span>
              {isSkelbimas && (
                <span style={{ fontSize: 11, color: '#e37400', fontWeight: 500, background: '#fef3c7', borderRadius: 12, padding: '2px 8px' }}>
                  Skelbimas
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={iconBtn}><X size={16} color="#5f6368" /></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#9aa0a6', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} />
            {vieta.lat ? `${vieta.lat.toFixed(5)}, ${vieta.lng.toFixed(5)}` : 'Vieta nepridėta'}
          </span>
          <button onClick={() => onLocate?.(vieta)} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
            border: '1px solid #dadce0', background: 'white', color: '#5f6368', fontWeight: 500,
          }}>
            <Navigation size={11} />
            {vieta.lat ? 'Perkelti' : 'Žymėti'}
          </button>
        </div>
      </div>

      {/* Skelbimas info */}
      {isSkelbimas && (vieta.url || vieta.kaina || vieta.tel || vieta.vardas) && (
        <div style={{ borderBottom: '1px solid #f1f3f4', overflow: 'hidden' }}>
          {ogImage && <img src={ogImage} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />}
          <div style={{ padding: '10px 16px', background: '#fffbf0', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {vieta.kaina && <span style={{ fontSize: 14, fontWeight: 700, color: '#e37400' }}>{vieta.kaina.toLocaleString('lt-LT')} €</span>}
            {vieta.vardas && <span style={{ fontSize: 12, color: '#202124', display: 'flex', alignItems: 'center', gap: 6 }}><User size={12} color="#9aa0a6" />{vieta.vardas}</span>}
            {vieta.tel && <a href={`tel:${vieta.tel}`} style={{ fontSize: 12, color: '#202124', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} color="#9aa0a6" />{vieta.tel}</a>}
            {vieta.url && <a href={vieta.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1a73e8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}><ExternalLink size={12} />Atidaryti skelbimą</a>}
          </div>
        </div>
      )}

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Status buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {VIETA_KEYS.map(key => {
            const t = VIETA_THEME[key];
            const active = vieta.statusas === key;
            const Icon = STATUS_ICONS[key];
            return (
              <button key={key} disabled={saving} onClick={() => handleStatus(key)} style={{
                flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 500,
                border: `1.5px solid ${active ? t.color : '#dadce0'}`,
                background: active ? t.bg : 'white',
                color: active ? t.color : '#5f6368',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <Icon size={12} />{t.label}
              </button>
            );
          })}
        </div>

        {/* Attrs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {VIETA_ATTRS.map(({ key, label }) => {
            const Icon = ATTR_ICONS[key];
            const active = vieta[key];
            return (
              <button key={key} onClick={() => toggleAttr(key)} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: `1.5px solid ${active ? '#1a73e8' : '#dadce0'}`,
                background: active ? '#e8f0fe' : 'white',
                color: active ? '#1a73e8' : '#5f6368',
                fontWeight: active ? 600 : 400,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {Icon && <Icon size={11} />}{label}
              </button>
            );
          })}
        </div>

        {/* Contact */}
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <User size={13} color="#9aa0a6" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input value={vardas} onChange={e => setVardas(e.target.value)} onBlur={() => save('vardas', vardas.trim())} placeholder="Vardas" style={{ ...field, paddingLeft: 28 }} />
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
            <Phone size={13} color="#9aa0a6" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input value={tel} onChange={e => setTel(e.target.value)} onBlur={() => save('tel', tel.trim())} placeholder="Tel." type="tel" style={{ ...field, paddingLeft: 28 }} />
          </div>
        </div>

        {/* Komentaras */}
        <textarea value={komentaras} onChange={e => setKomentaras(e.target.value)} onBlur={() => save('komentaras', komentaras)} placeholder="Komentaras..." rows={2} style={{ ...field, width: '100%', resize: 'vertical' }} />

        {/* Geo links */}
        {vieta.lat && (
          <div style={{ display: 'flex', gap: 6 }}>
            <GeoLink href={geoportalUrl(vieta.lat, vieta.lng)} label="Geoportal" />
            <GeoLink href={`http://www.etomesto.com/map-europe_lithuania_topo-500/?y=${vieta.lat}&x=${vieta.lng}`} label="Etomesto" />
          </div>
        )}

        {/* Delete */}
        <button onClick={() => { if (window.confirm('Ištrinti šią sodybą?')) onDelete(vieta.id); }} style={{
          width: '100%', padding: '8px', borderRadius: 8,
          border: '1px solid #fad2cf', background: '#fce8e6', color: '#c5221f',
          fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Trash2 size={13} />Ištrinti
        </button>
      </div>
    </div>
  );
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};

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
