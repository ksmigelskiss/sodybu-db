import { useState } from 'react';
import { Plus, ExternalLink, Trash2, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { openExternal } from '../lib/openExternal.js';

const REGIONAI = [
  { id: 'lt',    label: '🇱🇹 Lietuviški' },
  { id: 'eu',    label: '🌍 Užsienio' },
  { id: 'other', label: '🔗 Kiti' },
];

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #dadce0', borderRadius: 8, padding: '8px 10px',
  fontSize: 13, color: '#202124', background: 'white', outline: 'none',
  fontFamily: 'system-ui, sans-serif',
};
const btnPri = {
  flex: 2, padding: '8px 12px', borderRadius: 8, border: 'none',
  background: '#1a73e8', color: 'white', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
};
const btnSec = {
  flex: 1, padding: '8px', borderRadius: 8,
  border: '1px solid #dadce0', background: 'white', color: '#5f6368',
  fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
};

export default function PortalaiTab({ portalai, onAdd, onUpdate, onDelete, counts = {} }) {
  const [showAdd, setShowAdd]       = useState(false);
  const [newDomain, setNewDomain]   = useState('');
  const [newPav, setNewPav]         = useState('');
  const [newApr, setNewApr]         = useState('');
  const [newRegionas, setNewRegionas] = useState('lt');
  const [adding, setAdding]         = useState(false);

  const grouped = REGIONAI.map(r => ({
    ...r,
    items: portalai
      .filter(p => (p.regionas ?? 'other') === r.id)
      .sort((a, b) => (counts[b.domain] ?? 0) - (counts[a.domain] ?? 0)),
  }));

  const handleAdd = async () => {
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      let domain = newDomain.trim();
      try { domain = new URL(domain.startsWith('http') ? domain : `https://${domain}`).hostname.replace(/^www\./, ''); } catch {}
      await onAdd({
        domain,
        pavadinimas: newPav.trim() || domain,
        aprasymas:   newApr.trim() || null,
        regionas:    newRegionas,
        saltinis:    'rankinis',
        searchUrl:   null,
        pastaba:     null,
        logo:        `https://${domain}/favicon.ico`,
      });
      setNewDomain(''); setNewPav(''); setNewApr(''); setShowAdd(false);
    } finally { setAdding(false); }
  };

  const totalCount = portalai.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {totalCount === 0 && !showAdd && (
        <div style={{ padding: '32px 24px', textAlign: 'center', color: '#9aa0a6', fontSize: 13, lineHeight: 1.7 }}>
          <Globe size={28} color="#dadce0" style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 600, color: '#5f6368', marginBottom: 4 }}>Nėra portalų</div>
          <div>Importuok skelbimą — portalas įsimins automatiškai.<br />Arba pridėk rankiniu būdu.</div>
        </div>
      )}

      {grouped.map(group => {
        if (group.items.length === 0) return null;
        return (
          <div key={group.id}>
            <div style={{ padding: '12px 16px 4px', fontSize: 11, fontWeight: 700, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'system-ui, sans-serif' }}>
              {group.label}
            </div>
            {group.items.map(p => (
              <PortalCard key={p.id} portal={p} count={counts[p.domain] ?? 0} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
        );
      })}

      {/* Add form */}
      <div style={{ margin: '10px 12px 16px', borderRadius: 12, border: `1.5px dashed ${showAdd ? '#1a73e8' : '#dadce0'}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} style={{
            width: '100%', padding: '11px', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            color: '#5f6368', fontSize: 13, fontFamily: 'system-ui, sans-serif',
          }}>
            <Plus size={14} /> Pridėti portalą rankiniu būdu
          </button>
        ) : (
          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8, background: '#fafafa' }}>
            <input
              value={newDomain} onChange={e => setNewDomain(e.target.value)}
              placeholder="aruodas.lt arba https://…"
              autoFocus style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <input
              value={newPav} onChange={e => setNewPav(e.target.value)}
              placeholder="Pavadinimas (nebūtinas)" style={inputStyle}
            />
            <input
              value={newApr} onChange={e => setNewApr(e.target.value)}
              placeholder="Trumpas aprašymas (nebūtinas)" style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 5 }}>
              {REGIONAI.map(r => (
                <button key={r.id} onClick={() => setNewRegionas(r.id)} style={{
                  flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  border: `1.5px solid ${newRegionas === r.id ? '#1a73e8' : '#e8eaed'}`,
                  background: newRegionas === r.id ? '#e8f0fe' : 'white',
                  color: newRegionas === r.id ? '#1a73e8' : '#5f6368',
                  fontFamily: 'system-ui, sans-serif',
                }}>
                  {r.id === 'lt' ? '🇱🇹 LT' : r.id === 'eu' ? '🌍 EU' : '🔗 Kita'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowAdd(false); setNewDomain(''); setNewPav(''); setNewApr(''); }} style={btnSec}>Atšaukti</button>
              <button onClick={handleAdd} disabled={!newDomain.trim() || adding}
                style={{ ...btnPri, opacity: newDomain.trim() && !adding ? 1 : 0.5 }}>
                {adding ? 'Saugoma…' : 'Pridėti'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PortalCard({ portal, count, onUpdate, onDelete }) {
  const [open, setOpen]         = useState(false);
  const [editPav, setEditPav]   = useState(portal.pavadinimas ?? '');
  const [editApr, setEditApr]   = useState(portal.aprasymas   ?? '');
  const [editUrl, setEditUrl]   = useState(portal.searchUrl   ?? '');

  const save = (field, val) => {
    const cur = field === 'pavadinimas' ? portal.pavadinimas : field === 'aprasymas' ? portal.aprasymas : portal.searchUrl;
    if ((val || null) !== (cur || null)) onUpdate(portal.id, { [field]: val.trim() || null });
  };

  const setRegionas = (r) => {
    if (r !== (portal.regionas ?? 'other')) onUpdate(portal.id, { regionas: r });
  };

  return (
    <div style={{ margin: '0 12px 6px', borderRadius: 12, border: '1px solid #e8eaed', background: 'white', overflow: 'hidden' }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <FaviconImg domain={portal.domain} logo={portal.logo} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#202124', fontFamily: 'system-ui, sans-serif' }}>
            {portal.pavadinimas}
          </div>
          {portal.aprasymas && (
            <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 1, fontFamily: 'system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {portal.aprasymas}
            </div>
          )}
        </div>
        {count > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1a73e8', background: '#e8f0fe', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {count}
          </span>
        )}
        {portal.searchUrl && !open && (
          <a
            href={portal.searchUrl} target="_blank" rel="noreferrer"
            onClick={e => { e.preventDefault(); e.stopPropagation(); openExternal(portal.searchUrl); }}
            style={{ color: '#9aa0a6', display: 'flex', flexShrink: 0, padding: 2 }}
            title="Atidaryti paiešką"
          >
            <ExternalLink size={14} />
          </a>
        )}
        <div style={{ color: '#c4c7cc', display: 'flex', flexShrink: 0 }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Expanded edit section */}
      {open && (
        <div style={{ borderTop: '1px solid #f1f3f4', padding: '12px', display: 'flex', flexDirection: 'column', gap: 7, background: '#fafafa' }}>
          <input
            value={editPav} onChange={e => setEditPav(e.target.value)}
            onBlur={() => save('pavadinimas', editPav)}
            placeholder="Pavadinimas" style={inputStyle}
          />
          <input
            value={editApr} onChange={e => setEditApr(e.target.value)}
            onBlur={() => save('aprasymas', editApr)}
            placeholder="Aprašymas" style={inputStyle}
          />
          <input
            value={editUrl} onChange={e => setEditUrl(e.target.value)}
            onBlur={() => save('searchUrl', editUrl)}
            placeholder="Mano filtruotos paieškos URL (nebūtinas)"
            style={inputStyle}
          />
          {editUrl && (
            <a href={editUrl} target="_blank" rel="noreferrer"
              onClick={e => { e.preventDefault(); openExternal(editUrl); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#1a73e8', textDecoration: 'none',
              }}>
              <ExternalLink size={12} /> Atidaryti paiešką
            </a>
          )}
          <div style={{ display: 'flex', gap: 5 }}>
            {REGIONAI.map(r => {
              const active = (portal.regionas ?? 'other') === r.id;
              return (
                <button key={r.id} onClick={() => setRegionas(r.id)} style={{
                  flex: 1, padding: '5px 4px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                  border: `1.5px solid ${active ? '#1a73e8' : '#e8eaed'}`,
                  background: active ? '#e8f0fe' : 'white',
                  color: active ? '#1a73e8' : '#5f6368',
                  fontFamily: 'system-ui, sans-serif',
                }}>
                  {r.id === 'lt' ? '🇱🇹 LT' : r.id === 'eu' ? '🌍 EU' : '🔗 Kita'}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            <span style={{ fontSize: 11, color: '#c4c7cc', fontFamily: 'system-ui, sans-serif' }}>
              {portal.saltinis === 'auto' ? 'Aptikta automatiškai' : 'Pridėta rankiniu būdu'} · {portal.domain}
            </span>
            <button
              onClick={() => { if (window.confirm(`Ištrinti „${portal.pavadinimas}"?`)) onDelete(portal.id); }}
              style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid #fad2cf', background: '#fce8e6', color: '#c5221f', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'system-ui, sans-serif' }}
            >
              <Trash2 size={11} /> Ištrinti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FaviconImg({ domain, logo }) {
  const [errored, setErrored] = useState(false);
  const src = logo ?? `https://${domain}/favicon.ico`;
  if (errored) {
    return (
      <div style={{ width: 28, height: 28, borderRadius: 6, background: '#f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Globe size={15} color="#c4c7cc" />
      </div>
    );
  }
  return (
    <img
      src={src} alt="" width={28} height={28}
      onError={() => setErrored(true)}
      style={{ borderRadius: 6, flexShrink: 0, objectFit: 'contain', background: '#f1f3f4' }}
    />
  );
}
