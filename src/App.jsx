import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import SodybaMap from './components/SodybaMap.jsx';
import SodybaCard from './components/SodybaCard.jsx';
import VietaCard from './components/VietaCard.jsx';
import VietaForm from './components/VietaForm.jsx';
import VietaPanel from './components/VietaPanel.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import SkelbimosForm from './components/SkelbimosForm.jsx';
import { useSodybaList, updateSodybaStatus } from './hooks/useSodyba.js';
import { useVietos } from './hooks/useVietos.js';
import { useIsMobile } from './hooks/useIsMobile.js';
import { PIN_CURSOR } from './lib/mapLayers.js';
import { getApskritis } from './lib/apskritys.js';
import { TABS, VIETA_THEME, VIETA_DEFAULT_THEME, VIETA_KEYS } from './lib/theme.js';

export default function App() {
  const [filters, setFilters]             = useState({ tipas: 'Viensėdis' });
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [sheetOpen, setSheetOpen]         = useState(false);
  const isMobile = useIsMobile();
  const [selected, setSelected]           = useState(null);
  const [selectedVieta, setSelectedVieta] = useState(null);
  const [selectedApskritis, setSelectedApskritis] = useState(null);
  const [userPos, setUserPos]             = useState(null);
  const [activeTab, setActiveTab]         = useState('atrinktos');
  const [addMode, setAddMode]             = useState(false);
  const [newVietaPos, setNewVietaPos]     = useState(null);
  const [searchPos, setSearchPos]         = useState(null);
  const [showSkelbimosForm, setShowSkelbimosForm] = useState(false);
  const [locateVieta, setLocateVieta]         = useState(null);
  const [vietaStatusFilter, setVietaStatusFilter] = useState(null);

  const { items, loading, error, updateItem } = useSodybaList(filters);
  const { vietos, addVieta, updateVieta, deleteVieta } = useVietos();

  const displayZones = useMemo(() => {
    if (activeTab === 'atrinktos' || !selectedApskritis) return [];
    const byTab = activeTab === 'browse'
      ? items.filter(s => s.statusas === null || s.statusas === undefined)
      : items.filter(s => s.statusas !== null && s.statusas !== undefined);
    return byTab.filter(s => s.lat && s.lng && getApskritis(s.lat, s.lng) === selectedApskritis.id);
  }, [activeTab, selectedApskritis, items]);

  const displayVietos = useMemo(() => {
    let list = vietos;
    if (vietaStatusFilter === 'rasta') list = list.filter(v => !v.statusas);
    else if (vietaStatusFilter) list = list.filter(v => v.statusas === vietaStatusFilter);
    return list;
  }, [vietos, vietaStatusFilter]);

  const locateMe = useCallback(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setUserPos({ lat, lng });
    });
  }, []);

  const handleStatusChange = useCallback(async (id, statusas, komentaras) => {
    updateItem(id, { statusas, komentaras });
    setSelected(null);
    await updateSodybaStatus(id, statusas, komentaras);
  }, [updateItem]);

  const handleSelectZone = useCallback((s) => {
    setSelected(s); setSelectedVieta(null); setNewVietaPos(null); setAddMode(false);
  }, []);

  const handleSelectVieta = useCallback((v) => {
    setSelectedVieta(v); setSelected(null); setNewVietaPos(null); setAddMode(false);
  }, []);

  const handleUpdateVieta = useCallback(async (id, updates) => {
    await updateVieta(id, updates);
    setSelectedVieta(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  }, [updateVieta]);

  const handleDeleteVieta = useCallback(async (id) => {
    await deleteVieta(id); setSelectedVieta(null);
  }, [deleteVieta]);

  const handleMapClick = useCallback((lat, lng) => {
    if (locateVieta) {
      handleUpdateVieta(locateVieta.id, { lat, lng });
      setSelectedVieta({ ...locateVieta, lat, lng });
      setLocateVieta(null);
      return;
    }
    setAddMode(false); setNewVietaPos({ lat, lng });
  }, [locateVieta, handleUpdateVieta]);

  const handleSaveVieta = useCallback(async (data) => {
    const vieta = await addVieta({
      ...data,
      gyv_kodas: selected?.gyv_kodas ?? null,
      zonaPavadinimas: selected?.pavadinimas || selected?.adresas || null,
    });
    if (selected && !selected.statusas) {
      handleStatusChange(selected.id, 'ziureta', selected.komentaras ?? null);
    }
    setNewVietaPos(null);
    setSelectedVieta(vieta);
    setSelected(null);
  }, [addVieta, selected, handleStatusChange]);

  const handleAddSkelbimas = useCallback(async (data) => {
    const vieta = await addVieta(data);
    setShowSkelbimosForm(false);
    setActiveTab('atrinktos');
    setSelectedVieta(vieta);
  }, [addVieta]);

  const handleApskritisSelect = useCallback((a) => {
    setSelectedApskritis(a);
    setSelected(null);
    setSelectedVieta(null);
  }, []);

  const clearApskritis = useCallback(() => {
    setSelectedApskritis(null);
    setSelected(null);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (newVietaPos)         { setNewVietaPos(null); return; }
      if (showSkelbimosForm)   { setShowSkelbimosForm(false); return; }
      if (locateVieta)         { setLocateVieta(null); return; }
      if (addMode)             { setAddMode(false); return; }
      if (selectedVieta)       { setSelectedVieta(null); return; }
      if (selected)            { setSelected(null); return; }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [newVietaPos, showSkelbimosForm, locateVieta, addMode, selectedVieta, selected]);

  const mapZones = selected ? [selected] : (activeTab !== 'atrinktos' ? displayZones : []);

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  if (isMobile) {
    const showPanel = selectedVieta && !newVietaPos && !locateVieta;
    const showForm  = !!newVietaPos;
    const showSkelbimas = showSkelbimosForm && !newVietaPos;

    return (
      <div style={{ height: '100dvh', position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
        <SodybaMap
          items={[]}
          selected={null}
          onSelect={() => {}}
          userPos={userPos}
          vietos={vietos}
          selectedVieta={selectedVieta}
          onVietaSelect={v => { setSelectedVieta(v); setSheetOpen(false); }}
          addMode={addMode || !!locateVieta}
          addModeHint={locateVieta ? 'Spustelėkite sodybos vietą' : undefined}
          onMapClick={handleMapClick}
          activeTab="atrinktos"
          searchPos={searchPos}
          selectedApskritis={null}
          onApskritisSelect={undefined}
          newVietaPos={newVietaPos}
          bottomOffset={72}
        />

        {/* Add mode banner */}
        {(addMode || locateVieta) && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1100,
            background: '#1e293b', color: 'white', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
            📍 {locateVieta ? 'Spustelėkite sodybos vietą' : 'Spustelėkite vietą žemėlapyje'}
          </div>
        )}

        {/* FAB buttons - top right */}
        {!showPanel && !showForm && !showSkelbimas && (
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Fab onClick={locateMe} title="Mano vieta">🎯</Fab>
            <Fab onClick={() => { setAddMode(true); setSheetOpen(false); }} title="Žymėti sodybą" color="#1d4ed8">📍</Fab>
            <Fab onClick={() => { setShowSkelbimosForm(true); setSheetOpen(false); }} title="Pridėti skelbimą" color="#d97706" bold>+</Fab>
          </div>
        )}

        {/* Bottom sheet - Atrinktos list */}
        {!showPanel && !showForm && !showSkelbimas && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
            background: 'white', borderRadius: '16px 16px 0 0',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            maxHeight: sheetOpen ? '60vh' : 56,
            transition: 'max-height 0.25s ease',
            display: 'flex', flexDirection: 'column',
          }}>
            <button onClick={() => setSheetOpen(o => !o)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 2 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  ⭐ Atrinktos
                  <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 6 }}>({displayVietos.length})</span>
                </span>
              </div>
              <VietaStatusFilter value={vietaStatusFilter} onChange={setVietaStatusFilter} vietos={vietos} compact />
            </button>
            {sheetOpen && (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {displayVietos.length === 0
                  ? <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                      {vietos.length === 0 ? 'Dar nėra išsaugotų sodybų.' : 'Nėra pagal filtrą.'}
                    </div>
                  : displayVietos.map(v => (
                      <VietaCard key={v.id} vieta={v} selected={selectedVieta?.id === v.id}
                        onClick={() => { handleSelectVieta(v); setSheetOpen(false); }} />
                    ))
                }
              </div>
            )}
          </div>
        )}

        {/* VietaPanel bottom sheet */}
        {showPanel && (
          <VietaPanel vieta={selectedVieta} onClose={() => setSelectedVieta(null)}
            onUpdate={handleUpdateVieta} onDelete={handleDeleteVieta}
            onLocate={v => { setLocateVieta(v); setSelectedVieta(null); }}
            mobile />
        )}

        {/* VietaForm bottom sheet */}
        {showForm && (
          <VietaForm lat={newVietaPos.lat} lng={newVietaPos.lng}
            onSave={handleSaveVieta} onCancel={() => setNewVietaPos(null)} mobile />
        )}

        {/* SkelbimosForm bottom sheet */}
        {showSkelbimas && (
          <SkelbimosForm onSave={handleAddSkelbimas} onCancel={() => setShowSkelbimosForm(false)} mobile />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ padding: '8px 14px', background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🏡</span>
        <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>Sodybų paieška</span>
        <div style={{ flex: 1, display: 'flex', gap: 6, marginLeft: 8, position: 'relative' }}>
          <SearchBox onSelect={setSearchPos} />
          <HeaderBtn onClick={() => setAddMode(true)} title="Žymėti sodybą žemėlapyje" bg="#1d4ed8" cursor={PIN_CURSOR}>📍</HeaderBtn>
          <HeaderBtn onClick={() => { setShowSkelbimosForm(true); setActiveTab('atrinktos'); }} title="Pridėti skelbimą" bg="#d97706" bold>+</HeaderBtn>
        </div>
        <HeaderBtn onClick={locateMe} title="Mano vieta" bg="#2563eb">🎯</HeaderBtn>
      </header>

      {error &&<div style={{ padding: 12, background: '#fef2f2', color: '#dc2626', fontSize: 13 }}>Klaida: {error}</div>}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: sidebarOpen ? 320 : 0, display: 'flex', flexDirection: 'column', borderRight: sidebarOpen ? '1px solid #e5e7eb' : 'none', flexShrink: 0, overflow: 'hidden', transition: 'width 0.2s ease' }}>
          <Tabs tabs={TABS} active={activeTab} items={items} vietos={vietos}
            selectedApskritis={selectedApskritis} onChange={setActiveTab} />

          {activeTab !== 'atrinktos' && (
            <div style={{ padding: '7px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: selectedApskritis ? '#f0f7ff' : '#f8fafc', minHeight: 38 }}>
              {selectedApskritis ? (
                <>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                    📍 {selectedApskritis.label} apskritis
                    <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 6 }}>({displayZones.length})</span>
                  </span>
                  <button onClick={clearApskritis}
                    style={{ fontSize: 12, color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>
                    × {selectedApskritis.label}
                  </button>
                </>
              ) : (
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Spustelėkite apskritį žemėlapyje</span>
              )}
            </div>
          )}

          {activeTab === 'atrinktos' && (
            <VietaStatusFilter value={vietaStatusFilter} onChange={setVietaStatusFilter} vietos={vietos} />
          )}
          {activeTab !== 'atrinktos' && (
            <ZonuFilters filters={filters} onChange={setFilters} />
          )}

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {activeTab === 'atrinktos' && (
              displayVietos.length === 0
                ? <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                    {vietos.length === 0 ? <>Dar nėra išsaugotų sodybų.<br/>Naršyk ir spausk 📍 sodybos vietą.</> : 'Šioje apskrityje nėra sodybų.'}
                  </div>
                : displayVietos.map(v => (
                    <VietaCard key={v.id} vieta={v} selected={selectedVieta?.id === v.id}
                      onClick={() => handleSelectVieta(v)} />
                  ))
            )}

            {activeTab !== 'atrinktos' && selectedApskritis && (
              <>
                {loading && <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Kraunama...</div>}
                {!loading && displayZones.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                    {activeTab === 'browse' ? 'Visos vietovės peržiūrėtos.' : 'Dar nėra peržiūrėtų vietovių.'}
                  </div>
                )}
                {displayZones.map(s => (
                  <SodybaCard key={s.id} sodyba={s} selected={selected?.id === s.id}
                    onClick={() => handleSelectZone(s)} />
                ))}
              </>
            )}
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            zIndex: 1000, background: 'white', border: '1px solid #e2e8f0',
            borderLeft: 'none', borderRadius: '0 6px 6px 0',
            padding: '10px 4px', cursor: 'pointer', color: '#6b7280', fontSize: 11, lineHeight: 1,
            boxShadow: '2px 0 6px rgba(0,0,0,0.08)',
          }}>
            {sidebarOpen ? '‹' : '›'}
          </button>
          <SodybaMap
            items={mapZones}
            selected={selected}
            onSelect={handleSelectZone}
            userPos={userPos}
            vietos={vietos}
            selectedVieta={selectedVieta}
            onVietaSelect={handleSelectVieta}
            addMode={addMode || !!locateVieta}
            addModeHint={locateVieta ? 'Spustelėkite žemėlapyje sodybos vietą' : undefined}
            onMapClick={handleMapClick}
            activeTab={activeTab}
            searchPos={searchPos}
            selectedApskritis={selectedApskritis}
            onApskritisSelect={activeTab !== 'atrinktos' ? handleApskritisSelect : undefined}
            newVietaPos={newVietaPos}
          />
          {selected && !newVietaPos && (
            <DetailPanel sodyba={selected} onClose={() => setSelected(null)}
              onStatusChange={handleStatusChange} onAddVieta={() => setAddMode(true)} />
          )}
          {selectedVieta && !newVietaPos && !locateVieta && (
            <VietaPanel vieta={selectedVieta} onClose={() => setSelectedVieta(null)}
              onUpdate={handleUpdateVieta} onDelete={handleDeleteVieta}
              onLocate={(v) => { setLocateVieta(v); setSelectedVieta(null); }} />
          )}
          {showSkelbimosForm && !newVietaPos && (
            <SkelbimosForm onSave={handleAddSkelbimas} onCancel={() => setShowSkelbimosForm(false)} />
          )}
          {newVietaPos && (
            <VietaForm lat={newVietaPos.lat} lng={newVietaPos.lng}
              zonaPavadinimas={selected?.pavadinimas || selected?.adresas}
              onSave={handleSaveVieta} onCancel={() => setNewVietaPos(null)} />
          )}
        </div>
      </div>
    </div>
  );
}

function Fab({ onClick, title, color = '#1e293b', bold, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 44, height: 44, borderRadius: '50%', border: 'none',
      background: color, color: 'white', fontSize: 18, cursor: 'pointer',
      fontWeight: bold ? 700 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
    }}>
      {children}
    </button>
  );
}

function HeaderBtn({ onClick, title, bg, cursor, bold, children }) {
  return (
    <button onClick={onClick} title={title}
      style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: bg, color: 'white', cursor: cursor ?? 'pointer', fontSize: 13, fontWeight: bold ? 700 : 400, flexShrink: 0 }}>
      {children}
    </button>
  );
}

const TIPAI = [
  { value: '',          label: 'Visi' },
  { value: 'Viensėdis', label: '🏚 Viensėdis' },
  { value: 'Kaimas',    label: '🏘 Kaimas' },
];

function ZonuFilters({ filters, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '6px 10px', borderBottom: '1px solid #e5e7eb', background: '#fafafa', alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={filters.tipas ?? ''}
        onChange={e => onChange(f => ({ ...f, tipas: e.target.value }))}
        style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, color: '#374151', background: 'white' }}
      >
        {TIPAI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#374151' }}>
        Max adresai
        <input
          type="number" min={1} max={50} placeholder="visi"
          value={filters.maxAdresas ?? ''}
          onChange={e => onChange(f => ({ ...f, maxAdresas: e.target.value }))}
          style={{ width: 48, padding: '2px 5px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}
        />
      </label>
    </div>
  );
}

function VietaStatusFilter({ value, onChange, vietos, compact }) {
  const counts = { rasta: 0 };
  VIETA_KEYS.forEach(k => { counts[k] = 0; });
  vietos.forEach(v => {
    const key = v.statusas ?? 'rasta';
    if (key in counts) counts[key]++;
  });

  const options = [
    { key: '',           label: `Visos (${vietos.length})` },
    { key: 'rasta',      label: `📌 Rasta (${counts.rasta})` },
    ...VIETA_KEYS.map(k => ({ key: k, label: `${VIETA_THEME[k].label} (${counts[k] ?? 0})` })),
  ];

  if (compact) return (
    <select
      value={value ?? ''}
      onChange={e => { e.stopPropagation(); onChange(e.target.value || null); }}
      onClick={e => e.stopPropagation()}
      style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 11, color: '#374151', background: 'white', cursor: 'pointer' }}
    >
      {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );

  return (
    <div style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        style={{ width: '100%', padding: '4px 8px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 12, color: '#374151', background: 'white', cursor: 'pointer' }}
      >
        {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SearchBox({ onSelect }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const debounceRef             = useRef(null);
  const abortRef                = useRef(null);
  const wrapRef                 = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    const coordMatch = q.match(/^(-?\d+[.,]?\d*)[,\s]+(-?\d+[.,]?\d*)$/);
    if (coordMatch) {
      onSelect({ lat: parseFloat(coordMatch[1].replace(',', '.')), lng: parseFloat(coordMatch[2].replace(',', '.')) });
      setOpen(false);
      return;
    }
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(`/api/geocode-proxy?q=${encodeURIComponent(q)}`, { signal: abortRef.current.signal });
      if (!res.ok) return;
      const data = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [onSelect]);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 350);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); }
    if (e.key === 'Enter' && results.length > 0) { pick(results[0]); }
  };

  const pick = (r) => {
    onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setQuery(r.display_name.split(',')[0]);
    setOpen(false);
    setResults([]);
  };

  const label = (r) => {
    const a = r.address ?? {};
    let name;
    if (a.house_number) {
      name = [a.road, a.house_number].filter(Boolean).join(' ');
    } else {
      name = r.name || a.road || a.village || a.hamlet || a.town || a.city || r.display_name.split(',')[0];
    }
    const city = a.city || a.town || a.village || a.municipality;
    const parts = [city, a.county || a.state].filter(Boolean).join(', ');
    return { name: name || r.display_name.split(',')[0], parts };
  };

  return (
    <div ref={wrapRef} style={{ flex: 1, position: 'relative' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Ieškoti vietos, kaimo, adreso..."
          style={{
            flex: 1, padding: '5px 10px', borderRadius: 7, border: 'none',
            fontSize: 13, minWidth: 0, background: '#334155', color: 'white',
            outline: 'none',
          }}
        />
        <button
          onClick={() => search(query)}
          style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#475569', color: 'white', cursor: 'pointer', fontSize: 13 }}>
          {loading ? '…' : '🔍'}
        </button>
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 40, marginTop: 4,
          background: 'white', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          zIndex: 9999, overflow: 'hidden',
        }}>
          {results.map((r, i) => {
            const { name, parts } = label(r);
            return (
              <div key={r.place_id ?? i}
                onMouseDown={() => pick(r)}
                style={{
                  padding: '8px 12px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid #f1f5f9' : 'none',
                  display: 'flex', flexDirection: 'column', gap: 1,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{name}</span>
                {parts && <span style={{ fontSize: 11, color: '#9ca3af' }}>{parts}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tabs({ tabs, active, items, vietos, selectedApskritis, onChange }) {
  const count = (tab) => {
    if (tab.id === 'atrinktos') return vietos.length;
    if (!selectedApskritis) return null;
    if (tab.id === 'browse')   return items.filter(s => s.statusas == null && s.lat && s.lng && getApskritis(s.lat, s.lng) === selectedApskritis.id).length;
    if (tab.id === 'ziuretos') return items.filter(s => s.statusas != null && s.lat && s.lng && getApskritis(s.lat, s.lng) === selectedApskritis.id).length;
    return null;
  };
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
      {tabs.map(tab => {
        const n = count(tab);
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{
            flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: active === tab.id ? 'white' : '#f8fafc',
            color: active === tab.id ? '#1e293b' : '#64748b',
            borderBottom: active === tab.id ? '2px solid #2563eb' : '2px solid transparent',
          }}>
            {tab.label}
            {n != null && n > 0 && (
              <span style={{ marginLeft: 4, background: '#e2e8f0', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{n}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
