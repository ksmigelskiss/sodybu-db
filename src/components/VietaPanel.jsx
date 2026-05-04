import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Trash2, Phone, User, ExternalLink, Car, Eye, XCircle, Droplets, Waves, Apple, Trees, Navigation, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { VIETA_KEYS, VIETA_THEME, VIETA_ATTRS, vietaTheme } from '../lib/theme.js';
import { geoportalUrl } from '../lib/coords.js';
import PhotoStrip from './PhotoStrip.jsx';

const ATTR_ICONS   = { upelis: Droplets, tvenkinys: Waves, sodas: Apple, medziai: Trees };
const STATUS_ICONS = { nuvaziuoti: Car, aplankyta: Eye, atmesta: XCircle };

// ── Typography scale ──────────────────────────────────────────────────────────
const T = {
  title:   { fontSize: 18, fontWeight: 700, color: '#202124', lineHeight: 1.2, fontFamily: 'system-ui, sans-serif' },
  price:   { fontSize: 22, fontWeight: 800, color: '#b45309', letterSpacing: '-0.5px', fontFamily: 'system-ui, sans-serif' },
  body:    { fontSize: 13, color: '#3c4043', lineHeight: 1.45, fontFamily: 'system-ui, sans-serif' },
  caption: { fontSize: 12, color: '#5f6368', fontFamily: 'system-ui, sans-serif' },
  micro:   { fontSize: 11, color: '#9aa0a6', fontFamily: 'system-ui, sans-serif' },
  input:   { fontSize: 13, color: '#202124', fontFamily: 'system-ui, sans-serif' },
};

export default function VietaPanel({ vieta, onClose, onUpdate, onDelete, onLocate, mobile }) {
  const [komentaras,  setKomentaras]  = useState(vieta.komentaras  || '');
  const [vardas,      setVardas]      = useState(vieta.vardas       || '');
  const [tel,         setTel]         = useState(vieta.tel          || '');
  const [pavadinimas, setPavadinimas] = useState(vieta.zonaPavadinimas || '');
  const [saving,      setSaving]      = useState(false);
  const [ogImage,     setOgImage]     = useState(null);
  const [noteOpen,    setNoteOpen]    = useState(!!(vieta.komentaras));
  const [coordEdit,   setCoordEdit]   = useState(!vieta.lat); // auto-open if no location
  const [coordInput,  setCoordInput]  = useState('');
  const [geocoding,   setGeocoding]   = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setKomentaras(vieta.komentaras  || '');
    setVardas(vieta.vardas          || '');
    setTel(vieta.tel                || '');
    setPavadinimas(vieta.zonaPavadinimas || '');
    setNoteOpen(!!(vieta.komentaras));
    setCoordEdit(!vieta.lat);
    setCoordInput('');
  }, [vieta.id]);

  useEffect(() => {
    if (!vieta.url) { setOgImage(null); return; }
    setOgImage(null);
    fetch(`/api/og-fetch?url=${encodeURIComponent(vieta.url)}`)
      .then(r => r.json())
      .then(d => setOgImage(d.image ?? null))
      .catch(() => {});
  }, [vieta.url]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [komentaras, noteOpen]);

  const th          = vietaTheme(vieta.statusas);
  const isSkelbimas = vieta.saltinis === 'skelbimas';
  const heroPhoto   = vieta.nuotraukos?.[0] ?? ogImage ?? null;
  const hasContact  = !isSkelbimas; // skelbimas shows contact in info block, not editable fields

  const handleStatus = async (key) => {
    const next = vieta.statusas === key ? null : key;
    setSaving(true);
    await onUpdate(vieta.id, { statusas: next });
    setSaving(false);
  };

  const toggleAttr = (key) => onUpdate(vieta.id, { [key]: !vieta[key] });
  const save       = (field, val) => onUpdate(vieta.id, { [field]: val || null });

  const wrap = mobile ? {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'white', borderRadius: '20px 20px 0 0',
    boxShadow: '0 -4px 32px rgba(0,0,0,0.16)',
    zIndex: 1200, maxHeight: '92dvh', overflowY: 'auto',
    display: 'flex', flexDirection: 'column',
  } : {
    position: 'absolute', bottom: 16, right: 16,
    background: 'white', borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)',
    width: 360, zIndex: 1000, maxHeight: 'calc(100vh - 80px)',
    overflowY: 'auto', display: 'flex', flexDirection: 'column',
  };

  return (
    <div style={wrap} className={mobile ? 'sheet-slide-up' : undefined}>
      {mobile && <div style={{ width: 40, height: 4, background: '#dadce0', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />}

      {/* ── Hero ── */}
      <div style={{ position: 'relative', flexShrink: 0, height: heroPhoto ? 200 : undefined }}>
        {heroPhoto
          ? <img src={heroPhoto} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
          : <div style={{ height: 8 }} />
        }
        <button onClick={onClose} style={{
          position: 'absolute', top: heroPhoto ? 12 : (mobile ? 6 : 12), right: 12,
          background: heroPhoto ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.06)',
          border: 'none', borderRadius: '50%',
          width: 32, height: 32, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={15} color={heroPhoto ? 'white' : '#5f6368'} />
        </button>
      </div>

      {/* ── Header ── */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #f1f3f4', flexShrink: 0 }}>
        {/* Editable title */}
        <input
          value={pavadinimas}
          onChange={e => setPavadinimas(e.target.value)}
          onBlur={() => save('zonaPavadinimas', pavadinimas.trim())}
          placeholder={vieta.lat ? `${vieta.lat.toFixed(4)}, ${vieta.lng.toFixed(4)}` : 'Pavadinimas…'}
          style={{
            width: '100%', border: 'none', outline: 'none', background: 'transparent',
            borderBottom: '2px solid transparent', borderRadius: 0, padding: '0 0 2px',
            ...T.title,
          }}
          onFocus={e => e.target.style.borderBottomColor = '#1a73e8'}
          onBlurCapture={e => e.target.style.borderBottomColor = 'transparent'}
        />

        {/* Status badges */}
        <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge color={th.color} bg={th.bg}>{th.label}</Badge>
          {isSkelbimas && <Badge color="#b45309" bg="#fef3c7">Skelbimas</Badge>}
        </div>

        {/* Coordinates row */}
        <div style={{ marginTop: 8 }}>
          {/* Compact display when coords set and not editing */}
          {vieta.lat && !coordEdit && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...T.micro, display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={11} color="#34a853" />
                {vieta.lat.toFixed(5)}, {vieta.lng.toFixed(5)}
              </span>
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => setCoordEdit(true)} style={relocateBtn}>
                  Keisti
                </button>
                <button onClick={() => onLocate?.(vieta)} style={relocateBtn}>
                  <Navigation size={11} />Perkelti
                </button>
              </div>
            </div>
          )}

          {/* Edit / no-coords mode */}
          {coordEdit && (
            <CoordInput
              coordInput={coordInput}
              setCoordInput={setCoordInput}
              geocoding={geocoding}
              hasExisting={!!vieta.lat}
              onCancel={() => { setCoordEdit(false); setCoordInput(''); }}
              onPickMap={() => { setCoordEdit(false); onLocate?.(vieta); }}
              onApply={async (raw) => {
                // Try parse as coordinates first
                const parsed = parseCoords(raw);
                if (parsed) {
                  await save('lat', parsed.lat); await save('lng', parsed.lng);
                  setCoordEdit(false); setCoordInput('');
                  return;
                }
                // Otherwise geocode as address
                if (raw.trim().length < 3) return;
                setGeocoding(true);
                try {
                  const res = await fetch(`/api/geocode-proxy?q=${encodeURIComponent(raw + ' Lietuva')}`);
                  const data = await res.json();
                  if (data?.[0]) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    await onUpdate(vieta.id, { lat, lng });
                    setCoordEdit(false); setCoordInput('');
                  } else {
                    alert('Adresas nerastas. Bandyk tiksliau arba naudok koordinates.');
                  }
                } catch { alert('Klaida ieškant adreso.'); }
                finally { setGeocoding(false); }
              }}
            />
          )}
        </div>
      </div>

      {/* ── Skelbimas info block ── */}
      {isSkelbimas && (vieta.kaina || vieta.tel || vieta.vardas || vieta.url) && (
        <div style={{ padding: '12px 16px', background: '#fffbf0', borderBottom: '1px solid #f1f3f4', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          {vieta.kaina && (
            <span style={T.price}>{vieta.kaina.toLocaleString('lt-LT')} €</span>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 20px' }}>
            {vieta.vardas && (
              <span style={{ ...T.caption, display: 'flex', alignItems: 'center', gap: 5 }}>
                <User size={12} color="#9aa0a6" />{vieta.vardas}
              </span>
            )}
            {vieta.tel && (
              <a href={`tel:${vieta.tel}`} style={{ ...T.caption, color: '#1a73e8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={12} color="#9aa0a6" />{vieta.tel}
              </a>
            )}
            {vieta.url && (
              <a href={vieta.url} target="_blank" rel="noreferrer" style={{ ...T.caption, color: '#1a73e8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <ExternalLink size={12} />Atidaryti skelbimą
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Navigate CTA — top of body if has location */}
        {vieta.lat && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${vieta.lat},${vieta.lng}`}
            target="_blank" rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px', borderRadius: 12,
              background: '#1a73e8', color: 'white',
              textDecoration: 'none', fontSize: 14, fontWeight: 700,
              letterSpacing: '0.1px',
            }}
          >
            <Navigation size={16} />Važiuoti
          </a>
        )}

        {/* Status buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {VIETA_KEYS.map(key => {
            const t = VIETA_THEME[key];
            const active = vieta.statusas === key;
            const Icon = STATUS_ICONS[key];
            return (
              <button key={key} disabled={saving} onClick={() => handleStatus(key)} style={{
                flex: 1, height: 40, borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${active ? t.color : '#e8eaed'}`,
                background: active ? t.bg : '#fafafa',
                color: active ? t.color : '#5f6368',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                transition: 'all 0.12s',
                fontFamily: 'system-ui, sans-serif',
              }}>
                <Icon size={14} />
                <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Nature attrs — 2×2 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {VIETA_ATTRS.map(({ key, label }) => {
            const Icon = ATTR_ICONS[key];
            const active = vieta[key];
            return (
              <button key={key} onClick={() => toggleAttr(key)} style={{
                padding: '7px 10px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                border: `1.5px solid ${active ? '#1a73e8' : '#e8eaed'}`,
                background: active ? '#e8f0fe' : '#fafafa',
                color: active ? '#1a73e8' : '#5f6368',
                fontWeight: active ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.12s',
                fontFamily: 'system-ui, sans-serif',
              }}>
                {Icon && <Icon size={13} />}{label}
              </button>
            );
          })}
        </div>

        {/* Contact fields — only for non-skelbimas */}
        {hasContact && (
          <div style={{ display: 'flex', gap: 8 }}>
            <InputField icon={<User size={13} color="#c4c7cc" />} placeholder="Vardas"
              value={vardas} onChange={setVardas} onBlur={() => save('vardas', vardas.trim())} />
            <InputField icon={<Phone size={13} color="#c4c7cc" />} placeholder="Tel." type="tel"
              value={tel} onChange={setTel} onBlur={() => save('tel', tel.trim())} />
          </div>
        )}

        {/* Notes — collapsible, auto-grow */}
        <div>
          <button
            onClick={() => setNoteOpen(o => !o)}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 0', marginBottom: noteOpen ? 6 : 0,
            }}
          >
            <span style={{ ...T.micro, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: komentaras ? '#3c4043' : '#9aa0a6' }}>
              {komentaras ? 'Komentaras' : 'Pridėti komentarą'}
            </span>
            {noteOpen ? <ChevronUp size={14} color="#9aa0a6" /> : <ChevronDown size={14} color="#9aa0a6" />}
          </button>
          {noteOpen && (
            <textarea
              ref={textareaRef}
              value={komentaras}
              onChange={e => { setKomentaras(e.target.value); }}
              onBlur={() => save('komentaras', komentaras)}
              placeholder="Komentaras…"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'none', overflow: 'hidden',
                padding: '10px 12px', lineHeight: 1.55, borderRadius: 10,
                border: '1px solid #e8eaed', outline: 'none', background: '#fafafa',
                ...T.input,
              }}
            />
          )}
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: '#f1f3f4', margin: '0 -16px' }} />

        {/* Geo links + delete in one clean row */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {vieta.lat && (
            <>
              <GeoLink href={geoportalUrl(vieta.lat, vieta.lng)} label="Geoportal" />
              <GeoLink href={`http://www.etomesto.com/map-europe_lithuania_topo-500/?y=${vieta.lat}&x=${vieta.lng}`} label="Etomesto" />
            </>
          )}
          {!vieta.lat && <div style={{ flex: 1 }} />}
          <button
            onClick={() => { if (window.confirm('Ištrinti šią sodybą?')) onDelete(vieta.id); }}
            style={{
              padding: '6px 10px', borderRadius: 8, flexShrink: 0,
              border: '1px solid #fad2cf', background: '#fce8e6', color: '#c5221f',
              fontSize: 12, cursor: 'pointer', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <Trash2 size={12} />Ištrinti
          </button>
        </div>

        {/* Photos */}
        <PhotoStrip vieta={vieta} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Badge({ color, bg, children }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color, background: bg,
      borderRadius: 20, padding: '3px 10px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {children}
    </span>
  );
}

function InputField({ icon, placeholder, value, onChange, onBlur, type }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
      border: '1px solid #e8eaed', borderRadius: 10, padding: '0 12px',
      background: '#fafafa', minHeight: 40,
    }}>
      {icon}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        type={type}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          padding: '10px 0', fontSize: 13, color: '#202124',
          fontFamily: 'system-ui, sans-serif',
        }}
      />
    </div>
  );
}

function GeoLink({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      flex: 1, textAlign: 'center', background: '#f8f9fa', borderRadius: 8,
      padding: '7px 4px', textDecoration: 'none', color: '#5f6368', fontSize: 11, fontWeight: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <ExternalLink size={10} />{label}
    </a>
  );
}

const relocateBtn = {
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
  border: '1px solid #e8eaed', background: 'white', color: '#5f6368', fontWeight: 500,
  fontFamily: 'system-ui, sans-serif',
};

// ── Coordinate parser (same logic as SkelbimosImport) ────────────────────────
function parseCoords(raw) {
  const s = raw.trim();
  // Google Maps URL
  let m = s.match(/@(5[3456]\.\d+),(2[0-6]\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = s.match(/[?&]q=(5[3456]\.\d+),(2[0-6]\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  // Decimal pair
  const clean = s.replace(/[()[\]]/g, '');
  const parts = clean.split(/[\s,]+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parseFloat(parts[0]), b = parseFloat(parts[1]);
    if (a >= 53.8 && a <= 56.5 && b >= 20.9 && b <= 26.9) return { lat: a, lng: b };
    if (b >= 53.8 && b <= 56.5 && a >= 20.9 && a <= 26.9) return { lat: b, lng: a };
  }
  return null;
}

function CoordInput({ coordInput, setCoordInput, geocoding, hasExisting, onCancel, onPickMap, onApply }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 6,
          border: '1px solid #e8eaed', borderRadius: 8, padding: '0 10px', background: '#fafafa',
        }}>
          <Search size={12} color="#c4c7cc" />
          <input
            value={coordInput}
            onChange={e => setCoordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && coordInput.trim() && onApply(coordInput)}
            placeholder="Adresas arba 55.1234, 24.5678…"
            autoFocus
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              padding: '8px 0', fontSize: 12, color: '#202124',
              fontFamily: 'system-ui, sans-serif',
            }}
          />
          {geocoding && <span style={{ fontSize: 11, color: '#9aa0a6' }}>…</span>}
        </div>
        <button
          onClick={() => coordInput.trim() && onApply(coordInput)}
          disabled={!coordInput.trim() || geocoding}
          style={{
            padding: '0 12px', borderRadius: 8, border: 'none',
            background: '#1a73e8', color: 'white', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', opacity: coordInput.trim() && !geocoding ? 1 : 0.4,
            fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap',
          }}
        >OK</button>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onPickMap} style={{
          flex: 1, padding: '5px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
          border: '1.5px dashed #e8eaed', background: 'white', color: '#5f6368',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          fontFamily: 'system-ui, sans-serif',
        }}>
          <Navigation size={11} color="#1a73e8" />Žymėti žemėlapyje
        </button>
        {hasExisting && (
          <button onClick={onCancel} style={{
            padding: '5px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
            border: '1px solid #e8eaed', background: 'white', color: '#9aa0a6',
            fontFamily: 'system-ui, sans-serif',
          }}>Atšaukti</button>
        )}
      </div>
    </div>
  );
}
