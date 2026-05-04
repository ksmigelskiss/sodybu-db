import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, MapPin, Check, AlertCircle, Euro, Home, Ruler, Calendar, Phone, User, MessageSquare, Droplets, Waves, Apple, Trees, ClipboardPaste, BookMarked } from 'lucide-react';
import { VIETA_ATTRS } from '../lib/theme.js';

const ATTR_ICONS = { upelis: Droplets, tvenkinys: Waves, sodas: Apple, medziai: Trees };
const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://sodybu-db.vercel.app';
const BOOKMARKLET = `javascript:(function(){var u=location.href;var t=document.body.innerText.slice(0,18000);var h='';var ogMeta=document.querySelector('meta[property="og:image"]');var imgUrl=ogMeta?ogMeta.content:null;if(!imgUrl){var SKIP=/logo|icon|avatar|pixel|1x1|sprite|track|banner|button|arrow|blank/i;var imgs=document.querySelectorAll('img[src]');for(var ii=0;ii<imgs.length;ii++){var s=imgs[ii].src;if(s&&s.startsWith('http')&&!SKIP.test(s)&&/\\.(jpe?g|png|webp)(\\?|$)/i.test(s)){imgUrl=s;break;}}}if(imgUrl)h='[IMG: '+imgUrl+']\\n';var html=document.documentElement.innerHTML;var r1=/\\blat=(5[3456]\\.\\d{4,})[\\s\\S]{0,60}?lng=(2[0-6]\\.\\d{4,})/i.exec(html);if(r1){h+='[GPS: lat='+r1[1]+', lng='+r1[2]+']\\n';}else{var ss=document.querySelectorAll('script');var re=/["']?(?:lat(?:itude)?|y)["']?\\s*[:=]\\s*(5[3456]\\.\\d{4,})[\\s\\S]{0,80}?["']?(?:l(?:ng|on)(?:gitude)?|x)["']?\\s*[:=]\\s*(2[0-6]\\.\\d{4,})/i;for(var i=0;i<ss.length;i++){var m=re.exec(ss[i].textContent);if(m){h+='[GPS: lat='+m[1]+', lng='+m[2]+']\\n';break;}}}window.open('${APP_URL}/#bm/'+encodeURIComponent(u)+'/'+encodeURIComponent(h+t),'_blank');})();`;

const field = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #dadce0', borderRadius: 8, padding: '8px 10px',
  fontSize: 16, color: '#202124', background: 'white', outline: 'none',
  fontFamily: 'system-ui, sans-serif',
};

async function geocodeAddress(adresas) {
  if (!adresas) return null;
  try {
    const r = await fetch(`/api/geocode-proxy?q=${encodeURIComponent(adresas + ' Lietuva')}`);
    const data = await r.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

export default function SkelbimosImport({ onSave, onCancel, onPickOnMap, mobile, initialUrl = '', initialText = '', initialExtracted = null }) {
  const [step, setStep]       = useState(() => initialExtracted ? 'preview' : initialText.length > 100 ? 'analyzing' : 'url');
  // 'url' → 'analyzing' → 'blocked' → 'preview' | 'saving'
  const [url]                 = useState(initialUrl);
  const [urlInput, setUrlInput] = useState(initialUrl || '');
  const [error, setError]     = useState(null);
  const [geocoding, setGeocoding]   = useState(false);

  const ie = initialExtracted;
  const [extracted, setExtracted]     = useState(ie ?? null);
  const [pavadinimas, setPavadinimas] = useState(ie?.pavadinimas ?? '');
  const [adresas, setAdresas]         = useState(ie?.adresas ?? '');
  const [kaina, setKaina]             = useState(ie?.kaina != null ? String(ie.kaina) : '');
  const [komentaras, setKomentaras]   = useState(ie?.komentaras ?? '');
  const [lat, setLat]                 = useState(ie?.lat != null ? String(ie.lat) : '');
  const [lng, setLng]                 = useState(ie?.lng != null ? String(ie.lng) : '');
  const [attrs, setAttrs]             = useState(() => {
    const a = {};
    if (initialExtracted) VIETA_ATTRS.forEach(({ key }) => { if (initialExtracted[key]) a[key] = true; });
    return a;
  });
  const [nuotrauka, setNuotrauka]     = useState(initialExtracted?._nuotrauka ?? '');
  const [coordEdit, setCoordEdit]     = useState(false);
  const [coordInput, setCoordInput]   = useState('');
  const [pastedText, setPastedText]   = useState('');
  const [showBm, setShowBm]           = useState(false);

  const handleAnalyzeText = () => analyze(urlInput, pastedText);

  // Auto-start if we arrived with text from bookmarklet
  useEffect(() => {
    if (initialText.length > 100) analyze(initialUrl, initialText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function analyze(useUrl, useText) {
    setError(null);
    setStep('analyzing');
    try {
      const res = await fetch('/api/extract-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: useUrl || undefined,
          text: useText || undefined,
        }),
      });
      const json = await res.json();

      if (json.blocked) {
        setStep('blocked');
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error || 'Klaida');

      const d = json.data;
      setExtracted(d);
      setPavadinimas(d.pavadinimas || '');
      setAdresas(d.adresas || '');
      setKaina(d.kaina != null ? String(d.kaina) : '');
      setKomentaras(d.komentaras || '');
      setLat(d.lat != null ? String(d.lat) : '');
      setLng(d.lng != null ? String(d.lng) : '');
      setNuotrauka(json.nuotrauka || '');
      const a = {};
      VIETA_ATTRS.forEach(({ key }) => { if (d[key]) a[key] = true; });
      setAttrs(a);
      setStep('preview');

      if ((d.lat == null || d.lng == null) && d.adresas) {
        setGeocoding(true);
        const geo = await geocodeAddress(d.adresas);
        if (geo) { setLat(String(geo.lat)); setLng(String(geo.lng)); }
        setGeocoding(false);
      }
    } catch (e) {
      setError(e.message);
      setStep('url');
    }
  }


  const handleSave = async () => {
    setStep('saving');
    await onSave({
      saltinis: 'skelbimas',
      url: urlInput.trim() || null,
      kaina: kaina ? Number(kaina) : null,
      vardas: extracted?.vardas || null,
      tel: extracted?.tel || null,
      komentaras: komentaras || null,
      lat: parseFloat(lat) || null,
      lng: parseFloat(lng) || null,
      statusas: null,
      pavadinimas: pavadinimas || null,
      nuotraukos: nuotrauka ? [nuotrauka] : [],
      ...attrs,
    });
  };

  const wrapStyle = mobile ? {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'white', borderRadius: '16px 16px 0 0',
    boxShadow: '0 -2px 16px rgba(0,0,0,0.12)',
    zIndex: 2000, maxHeight: '90dvh', overflowY: 'auto',
  } : {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'white', borderRadius: 14,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
    width: 440, maxHeight: '88vh', overflowY: 'auto',
    zIndex: 2000,
  };

  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 1999, background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(2px)' }} />
      <div style={wrapStyle} className={mobile ? 'sheet-slide-up' : undefined}>
        {mobile && <div style={{ width: 36, height: 4, background: '#dadce0', borderRadius: 2, margin: '10px auto 0' }} />}

        {/* Header */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#202124', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Sparkles size={16} color="#1a73e8" /> Importuoti iš skelbimo
          </span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={17} color="#5f6368" />
          </button>
        </div>

        <div style={{ padding: '16px' }}>

          {/* ── STEP: url ── */}
          {step === 'url' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Primary: paste URL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#202124' }}>
                  Įklijuok skelbimo nuorodą:
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && urlInput.trim() && analyze(urlInput, '')}
                    placeholder="https://www.aruodas.lt/..."
                    autoFocus
                    style={{
                      flex: 1, border: '1.5px solid #e8eaed', borderRadius: 10,
                      padding: '10px 12px', fontSize: 13, color: '#202124',
                      outline: 'none', background: 'white', fontFamily: 'system-ui, sans-serif',
                    }}
                    onFocus={e => e.target.style.borderColor = '#1a73e8'}
                    onBlur={e => e.target.style.borderColor = '#e8eaed'}
                  />
                  <button
                    onClick={() => urlInput.trim() && analyze(urlInput, '')}
                    disabled={!urlInput.trim()}
                    style={{ ...btnPri, flex: 'none', padding: '0 16px', opacity: urlInput.trim() ? 1 : 0.4 }}
                  >
                    <Sparkles size={14} />AI
                  </button>
                </div>
                {error && <div style={{ fontSize: 12, color: '#c5221f' }}>{error}</div>}
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: '#f1f3f4' }} />
                <span style={{ fontSize: 11, color: '#9aa0a6' }}>arba naudok automatinį sprendimą</span>
                <div style={{ flex: 1, height: 1, background: '#f1f3f4' }} />
              </div>

              {/* Secondary: bookmarklet / shortcut */}
              {mobile ? <IosShortcutGuide /> : <BookmarkletGuide bm={BOOKMARKLET} />}

              <button onClick={onCancel} style={btnSec}>Uždaryti</button>
            </div>
          )}

          {/* ── STEP: analyzing ── */}
          {step === 'analyzing' && (
            <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <Loader size={28} />
              <div style={{ color: '#5f6368', fontSize: 13 }}>Nuskaitome skelbimą…</div>
            </div>
          )}

          {/* ── STEP: blocked (Cloudflare etc.) ── */}
          {step === 'blocked' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#fff8e1', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={15} color="#f29900" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, color: '#5f6368', lineHeight: 1.6 }}>
                  <strong style={{ color: '#202124' }}>Portalas blokuoja automatinį nuskaitymą.</strong><br />
                  Atidaryk skelbimą naršyklėje, paspausk <Kbd>Ctrl+A</Kbd> → <Kbd>Ctrl+C</Kbd>, tada įklijuok čia:
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <ClipboardPaste size={13} color="#9aa0a6" style={{ position: 'absolute', left: 9, top: 10, pointerEvents: 'none' }} />
                <textarea
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder="Įklijuok čia (Ctrl+V)…"
                  rows={mobile ? 6 : 8}
                  autoFocus
                  style={{ ...field, paddingLeft: 28, resize: 'none', fontSize: 13, lineHeight: 1.5 }}
                />
                {pastedText.length > 0 && (
                  <span style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 11, color: '#9aa0a6' }}>
                    {(pastedText.length / 1000).toFixed(1)}K sim.
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep('url')} style={btnSec}>← Atgal</button>
                <button
                  onClick={handleAnalyzeText}
                  disabled={pastedText.trim().length < 50}
                  style={{ ...btnPri, opacity: pastedText.trim().length >= 50 ? 1 : 0.45 }}
                >
                  <Sparkles size={14} /> Analizuoti
                </button>
              </div>

              {/* Bookmarklet promo */}
              <button onClick={() => setShowBm(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 6, color: '#1a73e8', fontSize: 12, fontWeight: 500 }}>
                <BookMarked size={13} /> Norint ateityje išvengti copy-paste — naudok bookmarklet →
              </button>
              {showBm && (
                <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <BookmarkletLink bm={BOOKMARKLET} />
                  <div style={{ fontSize: 11, color: '#5f6368', lineHeight: 1.6 }}>
                    Nutempk į Bookmarks juostą. Skelbimo puslapyje — vienas paspaudimas ir duomenys ateina automatiškai.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: preview ── */}
          {(step === 'preview' || step === 'saving') && extracted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {nuotrauka && (
                <div style={{ borderRadius: 10, overflow: 'hidden', background: '#f1f3f4', aspectRatio: '16/9' }}>
                  <img src={nuotrauka} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { e.currentTarget.parentElement.style.display = 'none'; }} />
                </div>
              )}

              <Field label="Pavadinimas" icon={<Home size={13} color="#9aa0a6" />}>
                <input value={pavadinimas} onChange={e => setPavadinimas(e.target.value)} style={field} />
              </Field>

              <Field label="Adresas" icon={<MapPin size={13} color="#9aa0a6" />}>
                <input value={adresas} onChange={e => setAdresas(e.target.value)} style={field} />
              </Field>

              <div style={{ display: 'flex', gap: 8 }}>
                <Field label="Kaina (€)" icon={<Euro size={13} color="#9aa0a6" />} style={{ flex: 1 }}>
                  <input value={kaina} onChange={e => setKaina(e.target.value.replace(/\D/g, ''))} placeholder="—" style={field} />
                </Field>
                {extracted.plotas_namas && (
                  <Field label="Namo plotas" icon={<Ruler size={13} color="#9aa0a6" />} style={{ flex: 1 }}>
                    <input defaultValue={`${extracted.plotas_namas} m²`} readOnly style={{ ...field, background: '#f8f9fa', color: '#5f6368' }} />
                  </Field>
                )}
              </div>

              <CoordSection
                lat={lat} lng={lng}
                geocoding={geocoding}
                coordEdit={coordEdit} setCoordEdit={setCoordEdit}
                coordInput={coordInput} setCoordInput={setCoordInput}
                onApply={(la, lo) => { setLat(la); setLng(lo); setCoordEdit(false); setCoordInput(''); }}
                onPickOnMap={onPickOnMap}
              />

              {/* Meta chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {extracted.statybos_metai && <Chip icon={<Calendar size={11} />}>{extracted.statybos_metai} m.</Chip>}
                {extracted.plotas_sklypas  && <Chip icon={<Ruler size={11} />}>{extracted.plotas_sklypas}</Chip>}
                {extracted.kambariai       && <Chip icon={<Home size={11} />}>{extracted.kambariai} kamb.</Chip>}
                {extracted.vardas          && <Chip icon={<User size={11} />}>{extracted.vardas}</Chip>}
                {extracted.tel             && <Chip icon={<Phone size={11} />}>{extracted.tel}</Chip>}
              </div>

              {/* Attr toggles */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#5f6368', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Požymiai</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  {VIETA_ATTRS.map(({ key, label }) => {
                    const Icon = ATTR_ICONS[key];
                    const active = !!attrs[key];
                    return (
                      <button key={key} onClick={() => setAttrs(a => ({ ...a, [key]: !a[key] }))} style={{
                        padding: '6px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                        border: `1.5px solid ${active ? '#1a73e8' : '#e8eaed'}`,
                        background: active ? '#e8f0fe' : '#fafafa',
                        color: active ? '#1a73e8' : '#5f6368', fontWeight: active ? 600 : 400,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        transition: 'all 0.12s',
                      }}>
                        {Icon && <Icon size={12} />}{label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="Komentaras" icon={<MessageSquare size={13} color="#9aa0a6" />}>
                <textarea value={komentaras} onChange={e => setKomentaras(e.target.value)} rows={3} style={{ ...field, resize: 'none' }} />
              </Field>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep('url')} style={btnSec}>← Atgal</button>
                <button onClick={handleSave} disabled={step === 'saving'} style={{ ...btnPri, opacity: step === 'saving' ? 0.6 : 1 }}>
                  {step === 'saving' ? <><Loader /> Saugoma…</> : <><Check size={14} /> Išsaugoti sodybą</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, icon, children, style }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#5f6368', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>{icon}</span>}
        {/* Clone child with padding if icon present */}
        {icon
          ? <div style={{ paddingLeft: 28 }}>{children}</div>
          : children}
      </div>
    </div>
  );
}

// ── Coordinate parsing ────────────────────────────────────────────────────────
// Accepts: "54.67, 25.28" | "(54.67, 25.28)" | Google Maps URL @54.67,25.28
//          | "54°40'N 25°16'E" DMS | bare "54.6742 25.2824"
function parseCoords(raw) {
  const s = raw.trim();

  // Google Maps URL: @54.xxx,25.xxx or ?q=54.xxx,25.xxx or lat=54&lng=25
  let m = s.match(/@(5[3456]\.\d+),(2[0-6]\.\d+)/);
  if (m) return { lat: m[1], lng: m[2] };
  m = s.match(/[?&]q=(5[3456]\.\d+),(2[0-6]\.\d+)/);
  if (m) return { lat: m[1], lng: m[2] };
  m = s.match(/lat=(5[3456]\.\d+).*?l(?:ng|on)=(2[0-6]\.\d+)/i);
  if (m) return { lat: m[1], lng: m[2] };

  // DMS: 54°40'27"N 25°16'57"E
  const dms = s.match(/(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["\s]*[Nn][\s,]+(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["\s]*[Ee]/);
  if (dms) {
    const lat = (+dms[1] + +dms[2] / 60 + +dms[3] / 3600).toFixed(6);
    const lng = (+dms[4] + +dms[5] / 60 + +dms[6] / 3600).toFixed(6);
    return { lat, lng };
  }

  // Decimal pair: strip parens/brackets then split by comma/space
  const clean = s.replace(/[()[\]]/g, '');
  const parts = clean.split(/[\s,]+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parseFloat(parts[0]), b = parseFloat(parts[1]);
    if (a >= 53.8 && a <= 56.5 && b >= 20.9 && b <= 26.9) return { lat: String(a), lng: String(b) };
    if (b >= 53.8 && b <= 56.5 && a >= 20.9 && a <= 26.9) return { lat: String(b), lng: String(a) };
  }
  return null;
}

function CoordSection({ lat, lng, geocoding, coordEdit, setCoordEdit, coordInput, setCoordInput, onApply, onPickOnMap }) {
  const hasCoords = lat && lng;

  const tryApply = () => {
    const parsed = parseCoords(coordInput);
    if (parsed) { onApply(parsed.lat, parsed.lng); }
    else { /* shake / highlight — kept simple */ alert('Nepavyko atpažinti koordinačių. Bandyk: "54.6742, 25.2824"'); }
  };

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#5f6368', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
        Koordinatės
        {geocoding && <span style={{ color: '#1a73e8', fontWeight: 400 }}>⏳ ieškoma…</span>}
      </div>

      {/* Coords found — compact display + edit toggle */}
      {hasCoords && !coordEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0faf4', borderRadius: 8, padding: '8px 12px' }}>
          <MapPin size={13} color="#34a853" />
          <span style={{ fontSize: 13, color: '#202124', flex: 1, fontVariantNumeric: 'tabular-nums' }}>
            {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
          </span>
          <button onClick={() => { setCoordEdit(true); setCoordInput(`${lat}, ${lng}`); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', fontSize: 12, fontWeight: 600, padding: '2px 4px' }}>
            Keisti
          </button>
        </div>
      )}

      {/* No coords or editing — show input options */}
      {(!hasCoords || coordEdit) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Free-form input */}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={coordInput}
              onChange={e => setCoordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tryApply()}
              placeholder='54.6742, 25.2824  arba Google Maps nuoroda'
              autoFocus={coordEdit}
              style={{ ...field, flex: 1, fontSize: 14 }}
            />
            <button onClick={tryApply} disabled={!coordInput.trim()}
              style={{ padding: '0 12px', borderRadius: 8, border: 'none', background: '#1a73e8', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: coordInput.trim() ? 1 : 0.4, whiteSpace: 'nowrap' }}>
              OK
            </button>
          </div>

          {/* Format hints */}
          <div style={{ fontSize: 11, color: '#9aa0a6', lineHeight: 1.7 }}>
            Priimami formatai: <code>54.6742, 25.2824</code> · <code>(54.67, 25.28)</code> · Google Maps nuoroda · <code>54°40'N 25°16'E</code>
          </div>

          {/* Map pick */}
          {onPickOnMap && (
            <button onClick={async () => {
              const pos = await onPickOnMap();
              if (pos) onApply(String(pos.lat), String(pos.lng));
            }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
              borderRadius: 8, border: '1.5px dashed #dadce0', background: 'white',
              color: '#5f6368', fontSize: 13, cursor: 'pointer', fontWeight: 500,
            }}>
              <MapPin size={14} color="#1a73e8" /> Pažymėti žemėlapyje
            </button>
          )}

          {coordEdit && (
            <button onClick={() => { setCoordEdit(false); setCoordInput(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa0a6', fontSize: 12, textAlign: 'left', padding: 0 }}>
              ← Atšaukti keitimą
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// React blocks javascript: URLs in href — set it imperatively via DOM ref instead
function IosShortcutGuide() {
  const SHORTCUT_URL = 'https://www.icloud.com/shortcuts/add99da951dd48569a24ba5c61c0da8c';
  const apiUrl = 'https://sodybu-db.vercel.app/api/extract-listing';
  const steps = [
    {
      nr: 1,
      what: 'Shortcuts programa → paspausti +',
      result: 'Atsidaro tuščias shortcut',
    },
    {
      nr: 2,
      what: 'Add Action → ieškoti "Get Details of Safari" → pasirinkti',
      result: <>Atsiranda blokas: <em>"Get [?] from [Safari Web Page]"</em><br/>
               • Spausti pirmą mėlyną žodį → <strong>Page URL</strong><br/>
               • Spausti <strong>Safari Web Page</strong> → <strong>Shortcut Input</strong><br/>
               Dabar turėtų rodyti: <em>"Get Page URL from Shortcut Input"</em></>,
    },
    {
      nr: 3,
      what: 'Add Action → "Set Variable"',
      result: <>Variable Name: <code>listingUrl</code> · Value: (palikt kaip yra — automatiškai naudos URL iš 2 žingsnio)</>,
    },
    {
      nr: 4,
      what: 'Add Action → "Get Details of Safari" → pasirinkti dar kartą',
      result: <>• Pirmą mėlyną žodį → <strong>Page Contents</strong><br/>
               • <strong>Safari Web Page</strong> → <strong>Shortcut Input</strong><br/>
               Turi rodyti: <em>"Get Page Contents from Shortcut Input"</em></>,
    },
    {
      nr: 5,
      what: 'Add Action → "Set Variable"',
      result: <>Variable Name: <code>html</code></>,
    },
    {
      nr: 6,
      what: 'Add Action → "Get Contents of URL"',
      result: <>• URL: <code style={{fontSize:10,wordBreak:'break-all'}}>{apiUrl}</code><br/>
               • Method: <strong>POST</strong><br/>
               • Request Body: <strong>JSON</strong><br/>
               • Spausti <strong>+ Add new field</strong>: Text, key = <code>url</code>, value = pasirinkti Variable <em>listingUrl</em><br/>
               • Dar kartą <strong>+ Add new field</strong>: Text, key = <code>html</code>, value = Variable <em>html</em></>,
    },
    {
      nr: 7,
      what: 'Add Action → "Get Dictionary from Input"',
      result: 'Nieko nekonfigūruoti — paverčia API atsakymą į Dictionary',
    },
    {
      nr: 8,
      what: 'Add Action → "Get Value for Key"',
      result: <>Key: <code>appUrl</code></>,
    },
    {
      nr: 9,
      what: 'Add Action → "Open URL"',
      result: 'Palikt kaip yra',
    },
    {
      nr: 10,
      what: 'Viršuje paspausti ⓘ (Details)',
      result: <><strong>Show in Share Sheet</strong> → įjungti. Pavadinti <strong>"Importuoti sodybą"</strong> → Done</>,
    },
  ];
  const [showManual, setShowManual] = useState(false);
  return (
    <div style={{ background: '#fff8e1', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#202124' }}>🍎 iOS Shortcut — vienkartinis setup:</div>

      {/* One-tap install */}
      <a
        href={SHORTCUT_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: '#1a73e8', color: 'white', borderRadius: 8, padding: '11px',
          textDecoration: 'none', fontSize: 13, fontWeight: 700,
        }}
      >
        ⬇️ Įdiegti Shortcut'ą (1 paspaudimas)
      </a>

      <div style={{ fontSize: 11, color: '#5f6368', lineHeight: 1.6 }}>
        Po įdiegimo: Safari → Share ↑ → Edit Actions → rasti <strong>"Importuoti sodybą"</strong> → įjungti.
      </div>

      <div style={{ fontSize: 12, color: '#1a73e8', fontWeight: 600, borderTop: '1px solid #ffe082', paddingTop: 8, lineHeight: 1.6 }}>
        ✅ Naudojimas: Safari → skelbimas → Share ↑ → <em>Importuoti sodybą</em> → app atsidaro su duomenimis
      </div>

      {/* Manual steps collapsible */}
      <button onClick={() => setShowManual(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, color: '#9aa0a6', fontSize: 11 }}>
        {showManual ? '▲' : '▼'} Rankinis setup (jei nuoroda neveikia)
      </button>
      {showManual && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map(s => (
            <div key={s.nr} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 20, height: 20, borderRadius: '50%', background: '#9aa0a6', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{s.nr}</div>
              <div style={{ fontSize: 11, color: '#3c4043', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600 }}>{s.what}</div>
                {s.result && <div style={{ color: '#5f6368', lineHeight: 1.7 }}>{s.result}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookmarkletGuide({ bm }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#202124' }}>🔖 Kaip importuoti skelbimą?</div>
      <div style={{ fontSize: 12, color: '#5f6368', lineHeight: 1.7 }}>
        <strong>Bookmarklet</strong> — tai mažas skriptas išsaugotas kaip Bookmarks juostos mygtukas. Jį paspaudus bet kuriame skelbimo puslapyje, šis langas atsidaro su visais duomenimis automatiškai.
      </div>
      <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#202124' }}>Vienkartinis setup:</div>
        <div style={{ fontSize: 12, color: '#5f6368', lineHeight: 1.6 }}>
          Nutempk šį mygtuką į naršyklės <strong>Bookmarks juostą</strong> (drag &amp; drop):
        </div>
        <BookmarkletLink bm={bm} />
        <div style={{ fontSize: 11, color: '#9aa0a6', lineHeight: 1.6 }}>
          Jei juosta nematoma — naršyklėje įjunk: View → Show Bookmarks Bar (Ctrl+Shift+B)
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#1a73e8', fontWeight: 600, lineHeight: 1.6 }}>
        ✅ Naudojimas: atidaryk skelbimą → spusteli bookmarklet → šis langas atsidaro su duomenimis
      </div>
    </div>
  );
}

function BookmarkletLink({ bm }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.setAttribute('href', bm); }, [bm]);
  return (
    <a
      ref={ref}
      draggable
      onClick={e => e.preventDefault()}
      style={{
        alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6,
        background: '#1a73e8', color: 'white', borderRadius: 8, padding: '7px 14px',
        textDecoration: 'none', fontSize: 13, fontWeight: 600, cursor: 'grab', userSelect: 'none',
      }}
    >
      <Sparkles size={13} /> 📥 Importuoti sodybą
    </a>
  );
}

function Chip({ icon, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f3f4', borderRadius: 20, padding: '3px 9px', fontSize: 12, color: '#3c4043' }}>
      {icon}{children}
    </span>
  );
}

function Kbd({ children }) {
  return <kbd style={{ background: '#f1f3f4', border: '1px solid #dadce0', borderRadius: 4, padding: '1px 5px', fontSize: 11, fontFamily: 'monospace' }}>{children}</kbd>;
}

function Loader({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
  );
}

const btnPri = {
  flex: 2, padding: '10px 12px', borderRadius: 8, border: 'none',
  background: '#1a73e8', color: 'white', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  fontFamily: 'system-ui, sans-serif',
};
const btnSec = {
  flex: 1, padding: '10px', borderRadius: 8,
  border: '1px solid #dadce0', background: 'white', color: '#5f6368',
  fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
};
