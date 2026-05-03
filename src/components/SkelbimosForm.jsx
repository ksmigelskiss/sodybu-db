import { useState } from 'react';
import { Megaphone, Link, Euro, User, Phone, MessageSquare, X } from 'lucide-react';
import { VIETA_ATTRS } from '../lib/theme.js';

export default function SkelbimosForm({ onSave, onCancel, mobile }) {
  const [url, setUrl]               = useState('');
  const [kaina, setKaina]           = useState('');
  const [vardas, setVardas]         = useState('');
  const [tel, setTel]               = useState('');
  const [komentaras, setKomentaras] = useState('');
  const [attrs, setAttrs]           = useState({});
  const [saving, setSaving]         = useState(false);

  const toggleAttr = (key) => setAttrs(a => ({ ...a, [key]: !a[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        saltinis: 'skelbimas',
        url: url.trim() || null,
        kaina: kaina ? Number(kaina) : null,
        vardas: vardas.trim() || null,
        tel: tel.trim() || null,
        komentaras: komentaras || null,
        lat: null, lng: null, statusas: null,
        ...attrs,
      });
    } catch (e) {
      alert('Klaida: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const style = mobile ? {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'white', borderRadius: '16px 16px 0 0',
    boxShadow: '0 -2px 16px rgba(0,0,0,0.12)',
    zIndex: 2000, maxHeight: '85dvh', overflowY: 'auto',
  } : {
    position: 'absolute', bottom: 16, right: 16,
    background: 'white', borderRadius: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
    width: 320, zIndex: 2000,
  };

  return (
    <div style={style} className={mobile ? 'sheet-slide-up' : undefined}>
      {mobile && <div style={{ width: 36, height: 4, background: '#dadce0', borderRadius: 2, margin: '10px auto 0' }} />}

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f3f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#202124', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Megaphone size={15} color="#1a73e8" /> Pridėti skelbimą
        </span>
        <button onClick={onCancel} style={iconBtn}><X size={16} color="#5f6368" /></button>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ position: 'relative' }}>
          <Link size={13} color="#9aa0a6" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Nuoroda į skelbimą..." autoFocus style={{ ...field, paddingLeft: 28 }} />
        </div>

        <div style={{ position: 'relative' }}>
          <Euro size={13} color="#9aa0a6" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={kaina} onChange={e => setKaina(e.target.value.replace(/\D/g, ''))} placeholder="Kaina" style={{ ...field, paddingLeft: 28 }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <User size={13} color="#9aa0a6" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input value={vardas} onChange={e => setVardas(e.target.value)} placeholder="Vardas" style={{ ...field, paddingLeft: 28 }} />
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
            <Phone size={13} color="#9aa0a6" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input value={tel} onChange={e => setTel(e.target.value)} placeholder="Tel." type="tel" style={{ ...field, paddingLeft: 28 }} />
          </div>
        </div>

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

        <div style={{ position: 'relative' }}>
          <MessageSquare size={13} color="#9aa0a6" style={{ position: 'absolute', left: 9, top: 10, pointerEvents: 'none' }} />
          <textarea value={komentaras} onChange={e => setKomentaras(e.target.value)} placeholder="Komentaras..." rows={2} style={{ ...field, paddingLeft: 28, width: '100%', resize: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
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

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
};
