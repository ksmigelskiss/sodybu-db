import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Trash2, Phone, User, ExternalLink, Car, Eye, XCircle, Droplets, Waves, Apple, Trees, Home, Anchor, Mountain, Sun, Navigation, ChevronDown, ChevronUp, Search, Star, TrendingUp, TrendingDown, Minus, Loader } from 'lucide-react';
import { VIETA_KEYS, VIETA_THEME, VIETA_ATTRS, UZSIENIS_ATTRS, APSAUGOS_ZONOS, vietaTheme } from '../lib/theme.js';
import { SALYS, salisInfo } from '../lib/salis.js';
import { geoportalUrl } from '../lib/coords.js';
import { openExternal } from '../lib/openExternal.js';
import PhotoStrip from './PhotoStrip.jsx';

const ATTR_ICONS   = { upelis: Droplets, tvenkinys: Waves, sodas: Apple, medziai: Trees,
                       prie_juros: Anchor, gamtoje: Mountain, baseinas: Sun, kaimas: Home };
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
  const [navOpen,     setNavOpen]     = useState(false);
  const [ogImage,     setOgImage]     = useState(null);
  const [noteOpen,    setNoteOpen]    = useState(!!(vieta.komentaras));
  const [coordEdit,   setCoordEdit]   = useState(!vieta.lat); // auto-open if no location
  const [coordInput,  setCoordInput]  = useState('');
  const [geocoding,   setGeocoding]   = useState(false);
  const [vertinimas,  setVertinimas]  = useState(vieta.vertinimas ?? null);
  const [vertLoading, setVertLoading] = useState(false);
  const [vertError,   setVertError]   = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    setKomentaras(vieta.komentaras  || '');
    setVardas(vieta.vardas          || '');
    setTel(vieta.tel                || '');
    setPavadinimas(vieta.zonaPavadinimas || '');
    setNoteOpen(!!(vieta.komentaras));
    setCoordEdit(!vieta.lat);
    setCoordInput('');
    setVertinimas(vieta.vertinimas ?? null);
    setVertError(null);
    setVertLoading(false);
  }, [vieta.id]);

  async function fetchVertinimas() {
    setVertLoading(true);
    setVertError(null);
    setVertinimas(null);
    try {
      const atributai = ['upelis','tvenkinys','sodas','medziai','prie_juros','gamtoje','baseinas','kaimas'].filter(k => vieta[k]);
      const apsaugos = ['natura2000','saugoma_terit','vanduo_apsauga'].filter(k => vieta[k]);
      const res = await fetch('/api/value-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Secret': import.meta.env.VITE_APP_SECRET ?? '',
        },
        body: JSON.stringify({
          lat: vieta.lat, lng: vieta.lng,
          kaina: vieta.kaina || undefined,
          plotas_namas: vieta.plotas_namas || undefined,
          plotas_sklypas: vieta.plotas_sklypas || undefined,
          statybos_metai: vieta.statybos_metai || undefined,
          atributai,
          zonaPavadinimas: vieta.zonaPavadinimas || undefined,
          salis: vieta.salis || undefined,
          listing_text: vieta.listing_text || undefined,  // saved at import, skips re-fetch
          url: vieta.url || undefined,                   // fallback: re-fetch if no saved text
          komentaras: vieta.komentaras || undefined,     // last resort: 300-char summary
          apsaugos,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Klaida');
      const result = { ...json, calculatedAt: new Date().toISOString() };
      setVertinimas(result);
      // Persist so next open shows cached result without re-calling Claude
      onUpdate(vieta.id, { vertinimas: result });
    } catch (e) {
      setVertError(e.message || 'Nepavyko gauti vertinimo');
    } finally {
      setVertLoading(false);
    }
  }

  useEffect(() => {
    const isStorageUrl = (u) => u?.includes('firebasestorage.app') || u?.includes('storage.googleapis.com');
    const existing = vieta.nuotraukos?.[0] ?? null;

    if (existing) {
      setOgImage(null); // nuotraukos[0] shown directly via heroPhoto
      // Already cached → nothing to do
      if (isStorageUrl(existing)) return;
      // External URL in nuotraukos → cache it in background
      fetch(`/api/cache-photo?url=${encodeURIComponent(existing)}&vietaId=${vieta.id}`)
        .then(r => r.json())
        .then(d => { if (d.url && d.url !== existing) onUpdate(vieta.id, { nuotraukos: [d.url] }); })
        .catch(() => {});
      return;
    }

    // No photo yet → try og-fetch, then cache
    if (!vieta.url) { setOgImage(null); return; }
    setOgImage(null);
    fetch(`/api/og-fetch?url=${encodeURIComponent(vieta.url)}`)
      .then(r => r.json())
      .then(async d => {
        const imgUrl = d.image ?? null;
        setOgImage(imgUrl);
        if (!imgUrl) return;
        try {
          const cached = await fetch(`/api/cache-photo?url=${encodeURIComponent(imgUrl)}&vietaId=${vieta.id}`)
            .then(r => r.json());
          if (cached.url) {
            onUpdate(vieta.id, { nuotraukos: [cached.url] });
            setOgImage(cached.url);
          }
        } catch {}
      })
      .catch(() => {});
  }, [vieta.id, vieta.url, vieta.nuotraukos?.[0]]);

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
        <button
          onClick={() => onUpdate(vieta.id, { zvaigzdute: !vieta.zvaigzdute })}
          title={vieta.zvaigzdute ? 'Pašalinti žvaigždutę' : 'Pažymėti žvaigždute'}
          style={{
            position: 'absolute', top: heroPhoto ? 12 : (mobile ? 6 : 12), right: 52,
            background: vieta.zvaigzdute ? 'rgba(251,191,36,0.92)' : heroPhoto ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.06)',
            border: 'none', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          <Star size={15} color="white" fill={vieta.zvaigzdute ? 'white' : 'none'} />
        </button>
      </div>

      {/* ── Header ── */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #f1f3f4', flexShrink: 0 }}>
        {/* Editable title */}
        <input
          value={pavadinimas}
          onChange={e => setPavadinimas(e.target.value)}
          onBlur={() => save('zonaPavadinimas', pavadinimas.trim())}
          placeholder={vieta.lat && vieta.lng ? `${vieta.lat.toFixed(4)}, ${vieta.lng.toFixed(4)}` : 'Pavadinimas…'}
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
          {vieta.lat && vieta.lng && !coordEdit && (
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
                  await onUpdate(vieta.id, { lat: parsed.lat, lng: parsed.lng });
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
      {isSkelbimas && (vieta.kaina || vieta.tel || vieta.vardas || vieta.url || vieta.statybos_metai || vieta.plotas_sklypas || vieta.plotas_namas) && (
        <div style={{ padding: '10px 16px 12px', background: '#fffbf0', borderBottom: '1px solid #f1f3f4', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            {vieta.kaina
              ? <span style={T.price}>{vieta.kaina.toLocaleString('lt-LT')} €</span>
              : <div />}
            {(vieta.statybos_metai || vieta.plotas_sklypas || vieta.plotas_namas || vieta.kambariai) && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                {vieta.statybos_metai && <MetaChip>{vieta.statybos_metai} m.</MetaChip>}
                {vieta.plotas_sklypas  && <MetaChip>{vieta.plotas_sklypas}</MetaChip>}
                {vieta.plotas_namas    && <MetaChip>{vieta.plotas_namas} m²</MetaChip>}
                {vieta.kambariai       && <MetaChip>{vieta.kambariai} kamb.</MetaChip>}
              </div>
            )}
          </div>
          {(vieta.vardas || vieta.tel || vieta.url) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 8 }}>
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
                <a href={vieta.url} target="_blank" rel="noreferrer"
                  onClick={e => { e.preventDefault(); openExternal(vieta.url); }}
                  style={{ ...T.caption, color: '#1a73e8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ExternalLink size={12} />Atidaryti skelbimą
                </a>
              )}
            </div>
          )}
          {vieta.adresas && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, ...T.caption }}>
              <MapPin size={11} color="#c4c7cc" />{vieta.adresas}
            </div>
          )}
        </div>
      )}

      {/* ── Rinkos vertė ── */}
      {vieta.lat && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f3f4', flexShrink: 0 }}>
          {!vertinimas && !vertLoading && (
            <button
              onClick={fetchVertinimas}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px', borderRadius: 8, border: '1.5px dashed #dadce0',
                background: 'none', color: '#5f6368', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              <TrendingUp size={13} />
              Įvertinti rinkos kainą
            </button>
          )}
          {vertLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9aa0a6', fontSize: 12, padding: '6px 0' }}>
              <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
              {vieta.listing_text ? 'Siunčiama Claude…' : vieta.url ? 'Nuskaitomas skelbimas…' : 'Analizuojama…'}
            </div>
          )}
          {vertError && (
            <div style={{ fontSize: 11, color: '#c0392b', padding: '4px 0' }}>⚠ {vertError}</div>
          )}
          {vertinimas && <VertinimasBlock v={vertinimas} onRetry={fetchVertinimas} />}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Navigate CTA */}
        {vieta.lat && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setNavOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px', borderRadius: 12, border: 'none',
                background: '#1a73e8', color: 'white',
                fontSize: 14, fontWeight: 700, letterSpacing: '0.1px', cursor: 'pointer',
              }}
            >
              <Navigation size={16} />Važiuoti
            </button>
            {navOpen && (
              <>
                <div onClick={() => setNavOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
                  background: 'white', borderRadius: 12, zIndex: 101,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                }}>
                  {[
                    { label: 'Google Maps', emoji: '🗺️', url: `https://www.google.com/maps/dir/?api=1&destination=${vieta.lat},${vieta.lng}` },
                    { label: 'Waze',        emoji: '🚗', url: `https://waze.com/ul?ll=${vieta.lat},${vieta.lng}&navigate=yes` },
                    { label: 'Apple Maps',  emoji: '🍎', url: `https://maps.apple.com/?daddr=${vieta.lat},${vieta.lng}` },
                  ].map((opt, i, arr) => (
                    <a
                      key={opt.label}
                      href={opt.url} target="_blank" rel="noreferrer"
                      onClick={e => { e.preventDefault(); setNavOpen(false); openExternal(opt.url); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '13px 16px', textDecoration: 'none',
                        borderBottom: i < arr.length - 1 ? '1px solid #f1f3f4' : 'none',
                        color: '#202124', fontSize: 14, fontWeight: 500,
                        fontFamily: 'system-ui, sans-serif',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                      {opt.label}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
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

        {/* Country selector — single flag, dropdown on click */}
        <SalisDropdown
          value={vieta.salis ?? 'lt'}
          onChange={code => onUpdate(vieta.id, { salis: code })}
        />

        {/* Attrs — LT or foreign depending on salis */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {((!vieta.salis || vieta.salis === 'lt') ? VIETA_ATTRS : UZSIENIS_ATTRS).map(({ key, label }) => {
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

        {/* Apsaugos zonos — LT only, manual input */}
        {(!vieta.salis || vieta.salis === 'lt') && (
          <div>
            <div style={{ ...T.micro, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, color: '#9aa0a6' }}>
              Apsaugos zonos
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {APSAUGOS_ZONOS.map(({ key, label }) => {
                const active = vieta[key];
                return (
                  <button key={key} onClick={() => toggleAttr(key)} style={{
                    padding: '5px 10px', borderRadius: 10, fontSize: 11, cursor: 'pointer',
                    border: `1.5px solid ${active ? '#dc2626' : '#e8eaed'}`,
                    background: active ? '#fee2e2' : '#fafafa',
                    color: active ? '#dc2626' : '#9aa0a6',
                    fontWeight: active ? 600 : 400,
                    fontFamily: 'system-ui, sans-serif',
                  }}>
                    {active ? '⚠ ' : ''}{label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

function SalisDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = SALYS.find(s => s.code === value) ?? SALYS[0];
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: '#9aa0a6', fontFamily: 'system-ui, sans-serif' }}>Šalis</span>
      <button
        onClick={() => setOpen(o => !o)}
        title={current.label}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 8px', borderRadius: 8,
          border: '1.5px solid #e8eaed', background: 'white',
          cursor: 'pointer', fontSize: 15, lineHeight: 1,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {current.flag}
        <span style={{ fontSize: 11, color: '#5f6368' }}>{current.label}</span>
        <ChevronDown size={11} color="#9aa0a6" />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 201,
            background: 'white', borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
            overflow: 'hidden', minWidth: 180,
          }}>
            {SALYS.map((s, i) => (
              <button key={s.code} onClick={() => { onChange(s.code); setOpen(false); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: s.code === value ? '#e8f0fe' : 'white',
                borderBottom: i < SALYS.length - 1 ? '1px solid #f1f3f4' : 'none',
                fontFamily: 'system-ui, sans-serif',
              }}
              onMouseEnter={e => { if (s.code !== value) e.currentTarget.style.background = '#f8f9fa'; }}
              onMouseLeave={e => { e.currentTarget.style.background = s.code === value ? '#e8f0fe' : 'white'; }}
              >
                <span style={{ fontSize: 18 }}>{s.flag}</span>
                <span style={{ fontSize: 13, color: s.code === value ? '#1a73e8' : '#202124', fontWeight: s.code === value ? 600 : 400 }}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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

function MetaChip({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: 'rgba(180,83,9,0.08)', borderRadius: 20,
      padding: '2px 8px', fontSize: 11, color: '#92400e',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {children}
    </span>
  );
}

function GeoLink({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      onClick={e => { e.preventDefault(); openExternal(href); }}
      style={{
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

// ── Detalesnė analizė (expandable) ───────────────────────────────────────────
function VertinimasAnalize({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid #f1f3f4', paddingTop: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 4,
          color: '#1a73e8', fontSize: 11, fontWeight: 500,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {open ? 'Slėpti analizę' : 'Rodyti išsamią analizę'}
      </button>
      {open && (
        <div style={{
          marginTop: 8, fontSize: 12, color: '#3c4043', lineHeight: 1.6,
          fontFamily: 'system-ui, sans-serif', whiteSpace: 'pre-wrap',
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

// ── Rinkos vertės blokas ──────────────────────────────────────────────────────
const PALYGINIMAS_CONFIG = {
  brangu:    { color: '#b45309', bg: '#fef3c7', icon: TrendingUp,   label: 'Brangoka'  },
  teisinga:  { color: '#166534', bg: '#dcfce7', icon: Minus,        label: 'Teisinga'  },
  pigi:      { color: '#1d4ed8', bg: '#dbeafe', icon: TrendingDown, label: 'Pigi'      },
  nežinoma:  { color: '#6b7280', bg: '#f3f4f6', icon: Minus,        label: 'Nežinoma'  },
};

function VertinimasBlock({ v, onRetry }) {
  const cfg = PALYGINIMAS_CONFIG[v.palyginimas] ?? PALYGINIMAS_CONFIG['nežinoma'];
  const Icon = cfg.icon;
  const pct  = v.procentas != null ? Math.round(v.procentas) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={13} color="#5f6368" />
          <span style={{ ...T.micro, fontWeight: 600, color: '#5f6368' }}>RINKOS VERTĖ</span>
          {(v.dataSources?.textSource || v.dataSources?.rc || v.dataSources?.mvz) && (
            <span style={{ fontSize: 9, color: '#9aa0a6', background: '#f1f3f4', borderRadius: 3, padding: '1px 4px' }}>
              {[
                v.dataSources.textSource === 'saved'   && 'tekstas',
                v.dataSources.textSource === 'fetched' && 'fetch',
                v.dataSources.textSource === 'summary' && 'santrauka',
                v.dataSources.rc  && 'RC',
                v.dataSources.mvz && 'MVZ',
              ].filter(Boolean).join('+')}
            </span>
          )}
        </div>
        <button onClick={onRetry} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa0a6', padding: 2, lineHeight: 1, fontSize: 10 }}>↺</button>
      </div>

      {/* Main value */}
      {v.vertinimasEur && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#202124', letterSpacing: '-0.5px', fontFamily: 'system-ui, sans-serif' }}>
            {Math.round(v.vertinimasEur / 1000) * 1000 === v.vertinimasEur
              ? v.vertinimasEur.toLocaleString('lt-LT')
              : `~${Math.round(v.vertinimasEur / 1000) * 1000 > v.vertinimasEur
                    ? (Math.round((v.vertinimasEur + 500) / 1000) * 1000).toLocaleString('lt-LT')
                    : Math.round(v.vertinimasEur).toLocaleString('lt-LT')}`} €
          </span>
          {v.diapazonasMin && v.diapazonasMax && (
            <span style={{ ...T.micro }}>
              {Math.round(v.diapazonasMin / 1000)}k – {Math.round(v.diapazonasMax / 1000)}k €
            </span>
          )}
          {/* Palyginimas badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg,
            borderRadius: 20, padding: '2px 8px', fontFamily: 'system-ui, sans-serif',
          }}>
            <Icon size={10} />
            {cfg.label}
            {pct != null && ` ${pct > 0 ? '+' : ''}${pct}%`}
          </span>
        </div>
      )}

      {/* Value factors */}
      {v.veiksniai?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {v.veiksniai.map((f, i) => {
            const isPlus = f.startsWith('+');
            return (
              <span key={i} style={{
                fontSize: 10, fontWeight: 500,
                color: isPlus ? '#166534' : '#9a3412',
                background: isPlus ? '#dcfce7' : '#fee2e2',
                borderRadius: 4, padding: '1px 6px',
                fontFamily: 'system-ui, sans-serif',
              }}>
                {f}
              </span>
            );
          })}
        </div>
      )}

      {/* RC sandoriai */}
      {v.sandoriai?.length > 0 && (
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ ...T.micro, fontWeight: 600, marginBottom: 4 }}>Panašūs sandoriai (RC)</div>
          {v.sandoriai.slice(0, 4).map((s, i) => (
            <div key={i} style={{ ...T.micro, display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: i < Math.min(v.sandoriai.length, 4) - 1 ? '1px solid #e8eaed' : 'none' }}>
              <span style={{ flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.adresas || '—'}{s.plotas ? `, ${s.plotas}` : ''}
              </span>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                {s.kaina.toLocaleString('lt-LT')} €
                <span style={{ fontWeight: 400, marginLeft: 4 }}>{s.data?.slice(0, 7)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* MVZ */}
      {v.mvzEurHa && (
        <div style={{ ...T.micro }}>
          NŽT MVZ zona: ~{Math.round(v.mvzEurHa).toLocaleString()} €/ha
        </div>
      )}

      {/* Short comment */}
      {v.komentaras && (
        <div style={{
          ...T.micro, lineHeight: 1.5, color: '#5f6368',
          borderLeft: '2px solid #e8eaed', paddingLeft: 8,
        }}>
          {v.komentaras}
        </div>
      )}

      {/* Detailed analysis — expandable */}
      {v.analize && <VertinimasAnalize text={v.analize} />}

      {/* Confidence + date */}
      <div style={{ ...T.micro, color: '#c4c7cc' }}>
        Tikslumas: {v.confidence === 'high' ? 'aukštas' : v.confidence === 'medium' ? 'vidutinis' : 'žemas'}
        {' · '}AI vertinimas
        {v.calculatedAt && (
          <> · {new Date(v.calculatedAt).toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' })}</>
        )}
      </div>
    </div>
  );
}

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
