import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Search, MapPin, Navigation, X, ChevronLeft, ChevronRight, ChevronDown, House, LayoutGrid, Sparkles } from 'lucide-react';
import SodybaMap from './components/SodybaMap.jsx';
import SodybaCard from './components/SodybaCard.jsx';

import VietaForm from './components/VietaForm.jsx';
import VietaPanel from './components/VietaPanel.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import SkelbimosImport from './components/SkelbimosImport.jsx';
import { useSodybaList, updateSodybaStatus } from './hooks/useSodyba.js';
import { useVietos } from './hooks/useVietos.js';
import { useIsMobile } from './hooks/useIsMobile.js';
import { getApskritis } from './lib/apskritys.js';
import { VIETA_THEME, VIETA_KEYS } from './lib/theme.js';
import KortelesGrid from './components/KortelesGrid.jsx';
import LithuaniaMiniMap from './components/LithuaniaMiniMap.jsx';

const PANEL_W = 380;

const TABS = [
  { id: 'sodybos',   label: 'Sodybos',   icon: LayoutGrid },
  { id: 'vietoves',  label: 'Vietovės',  icon: MapPin },
];

const C = {
  primary:    '#1a73e8',
  text:       '#202124',
  textSec:    '#5f6368',
  textTer:    '#9aa0a6',
  surface:    '#ffffff',
  surfaceVar: '#f8f9fa',
  outline:    '#dadce0',
  shadow:     '0 2px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
  shadowFab:  '0 2px 8px rgba(0,0,0,0.2)',
};

export default function App() {
  const [filters, setFilters]             = useState({ tipas: 'Viensėdis' });
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [sheetOpen, setSheetOpen]         = useState(false);
  const isMobile = useIsMobile();
  const [selected, setSelected]           = useState(null);
  const [selectedVieta, setSelectedVieta] = useState(null);
  const [selectedApskritis, setSelectedApskritis] = useState(null);
  const [userPos, setUserPos]             = useState(null);
  const [activeTab, setActiveTab]         = useState('sodybos');
  const [addMode, setAddMode]             = useState(false);
  const [newVietaPos, setNewVietaPos]     = useState(null);
  const [searchPos, setSearchPos]         = useState(null);
  const [showImport, setShowImport]               = useState(false);
  const [importInitial, setImportInitial]         = useState({ url: '', text: '' });
  const [importExtracted, setImportExtracted]     = useState(null);
  const [importPickingMap, setImportPickingMap]   = useState(false);
  const importPickResolve = useRef(null);
  const [locateVieta, setLocateVieta]     = useState(null);
  const [vietaStatusFilter, setVietaStatusFilter] = useState('aktyvios');
  const swipeStartY = useRef(null);

  // Deep-link handlers
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#bm/')) {
      const parts = hash.slice(4).split('/');
      const bmUrl  = decodeURIComponent(parts[0] ?? '');
      const bmText = decodeURIComponent(parts.slice(1).join('/') ?? '');
      if (bmUrl || bmText) {
        setImportInitial({ url: bmUrl, text: bmText });
        setShowImport(true);
        setActiveTab('sodybos');
        window.history.replaceState(null, '', window.location.pathname);
      }
      return;
    }
    if (hash.startsWith('#shortcut/')) {
      try {
        const { data, nuotrauka, url: srcUrl } = JSON.parse(decodeURIComponent(hash.slice('#shortcut/'.length)));
        setImportExtracted({ ...data, _nuotrauka: nuotrauka });
        setImportInitial({ url: srcUrl ?? '', text: '' });
        setShowImport(true);
        setActiveTab('sodybos');
        window.history.replaceState(null, '', window.location.pathname);
      } catch {}
      return;
    }
    if (hash === '#import-preview') {
      try {
        const raw = sessionStorage.getItem('__sodybu_import');
        if (raw) {
          const { data, nuotrauka, url: srcUrl } = JSON.parse(raw);
          sessionStorage.removeItem('__sodybu_import');
          setImportExtracted({ ...data, _nuotrauka: nuotrauka });
          setImportInitial({ url: srcUrl ?? '', text: '' });
          setShowImport(true);
          setActiveTab('sodybos');
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      } catch {}
    }
    const params = new URLSearchParams(window.location.search);
    const shareUrl = params.get('share_url') || params.get('share_text') || '';
    if (shareUrl.startsWith('http')) {
      setImportInitial({ url: shareUrl, text: '' });
      setShowImport(true);
      setActiveTab('sodybos');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const { items, loading, error, updateItem } = useSodybaList(filters);
  const { vietos, addVieta, updateVieta, deleteVieta } = useVietos();

  const displayZones = useMemo(() => {
    if (activeTab !== 'vietoves' || !selectedApskritis) return [];
    return items
      .filter(s => s.statusas === null || s.statusas === undefined)
      .filter(s => s.lat && s.lng && getApskritis(s.lat, s.lng) === selectedApskritis.id);
  }, [activeTab, selectedApskritis, items]);

  const displayVietos = useMemo(() => {
    let list = vietos;
    if      (vietaStatusFilter === 'aktyvios')  list = list.filter(v => v.statusas !== 'atmesta');
    else if (vietaStatusFilter === 'rasta')     list = list.filter(v => !v.statusas && v.saltinis !== 'skelbimas');
    else if (vietaStatusFilter === 'skelbimas') list = list.filter(v => v.saltinis === 'skelbimas');
    else if (vietaStatusFilter)                 list = list.filter(v => v.statusas === vietaStatusFilter);
    return list;
  }, [vietos, vietaStatusFilter]);

  const locateMe = useCallback(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  const handleStatusChange = useCallback(async (id, statusas, komentaras) => {
    updateItem(id, { statusas, komentaras });
    setSelected(null);
    await updateSodybaStatus(id, statusas, komentaras);
  }, [updateItem]);

  const handleSelectZone  = useCallback((s) => { setSelected(s); setSelectedVieta(null); setNewVietaPos(null); setAddMode(false); }, []);
  const handleSelectVieta = useCallback((v) => { setSelectedVieta(v); setSelected(null); setNewVietaPos(null); setAddMode(false); }, []);

  const handleUpdateVieta = useCallback(async (id, updates) => {
    await updateVieta(id, updates);
    setSelectedVieta(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  }, [updateVieta]);

  const handleDeleteVieta = useCallback(async (id) => {
    await deleteVieta(id); setSelectedVieta(null);
  }, [deleteVieta]);

  const handleMapClick = useCallback((lat, lng) => {
    if (importPickingMap) {
      importPickResolve.current?.({ lat, lng });
      importPickResolve.current = null;
      setImportPickingMap(false);
      setAddMode(false);
      setShowImport(true);
      return;
    }
    if (locateVieta) {
      handleUpdateVieta(locateVieta.id, { lat, lng });
      setSelectedVieta({ ...locateVieta, lat, lng });
      setLocateVieta(null);
      return;
    }
    setAddMode(false); setNewVietaPos({ lat, lng });
  }, [importPickingMap, locateVieta, handleUpdateVieta]);

  const handleImportPickOnMap = useCallback(() => {
    setShowImport(false);
    setImportPickingMap(true);
    setAddMode(true);
    return new Promise(resolve => { importPickResolve.current = resolve; });
  }, []);

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
    setActiveTab('sodybos');
    setSelectedVieta(vieta);
  }, [addVieta]);

  const handleApskritisSelect = useCallback((a) => {
    setSelectedApskritis(a); setSelected(null); setSelectedVieta(null);
  }, []);

  const clearApskritis = useCallback(() => {
    setSelectedApskritis(null); setSelected(null);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (newVietaPos)   { setNewVietaPos(null); return; }
      if (showImport)    { setShowImport(false); return; }
      if (locateVieta)   { setLocateVieta(null); return; }
      if (addMode)       { setAddMode(false); return; }
      if (selectedVieta) { setSelectedVieta(null); return; }
      if (selected)      { setSelected(null); return; }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [newVietaPos, showImport, locateVieta, addMode, selectedVieta, selected]);

  const mapZones = selected ? [selected] : (activeTab === 'vietoves' ? displayZones : []);

  // ── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    const showPanel = selectedVieta && !newVietaPos && !locateVieta;
    const showForm  = !!newVietaPos;

    return (
      <div style={{ height: '100dvh', position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
        <SodybaMap
          items={[]}
          selected={null}
          onSelect={() => {}}
          userPos={userPos}
          vietos={displayVietos}
          selectedVieta={selectedVieta}
          onVietaSelect={v => { setSelectedVieta(v); setSheetOpen(false); }}
          addMode={addMode || !!locateVieta}
          addModeHint={locateVieta ? 'Spustelėkite sodybos vietą' : undefined}
          onMapClick={handleMapClick}
          activeTab="sodybos"
          searchPos={searchPos}
          selectedApskritis={null}
          onApskritisSelect={undefined}
          newVietaPos={newVietaPos}
          bottomOffset={108}
          sidebarOpen={false}
        />

        {!addMode && !locateVieta && !showPanel && !showForm && (
          <div style={{
            position: 'absolute', top: 12, left: 12, right: 12, zIndex: 1200,
            background: 'white', borderRadius: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
          }}>
            <SearchBox onSelect={pos => setSearchPos(pos)} />
          </div>
        )}

        {(addMode || locateVieta) && (
          <div style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1200, background: '#202124', color: 'white',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500,
            boxShadow: C.shadowFab, whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <MapPin size={14} />
            {importPickingMap ? 'Spustelėkite skelbimo vietą žemėlapyje' : locateVieta ? 'Spustelėkite sodybos vietą' : 'Spustelėkite vietą žemėlapyje'}
          </div>
        )}

        {!showPanel && !showForm && (
          <div style={{ position: 'fixed', right: 12, bottom: 116, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FabBtn onClick={locateMe} title="Mano vieta"><Navigation size={18} /></FabBtn>
            <FabBtn onClick={() => { setAddMode(true); setSheetOpen(false); }} title="Žymėti sodybą" primary><MapPin size={18} /></FabBtn>
            <FabBtn onClick={() => { setShowImport(true); setSheetOpen(false); }} title="Importuoti iš skelbimo"><Sparkles size={18} /></FabBtn>
          </div>
        )}

        {!showPanel && !showForm && (
          <>
            {sheetOpen && (
              <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1090, background: 'rgba(0,0,0,0.18)' }} />
            )}
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100,
              background: 'white', borderRadius: '14px 14px 0 0',
              boxShadow: '0 -2px 12px rgba(0,0,0,0.1)',
              maxHeight: sheetOpen ? '62dvh' : 48,
              transition: 'max-height 0.25s cubic-bezier(0.4,0,0.2,1)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div
                onTouchStart={e => { swipeStartY.current = e.touches[0].clientY; }}
                onTouchEnd={e => {
                  if (swipeStartY.current === null) return;
                  if (e.changedTouches[0].clientY - swipeStartY.current > 48) setSheetOpen(false);
                  swipeStartY.current = null;
                }}
                onClick={() => setSheetOpen(o => !o)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 6px', flexShrink: 0, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ width: 36, height: 4, background: '#dadce0', borderRadius: 2 }} />
                <ChevronDown size={15} color={C.textSec} style={{ marginTop: 3, transition: 'transform 0.2s', transform: sheetOpen ? 'rotate(0deg)' : 'rotate(180deg)' }} />
              </div>
              {sheetOpen && (
                <div style={{ padding: '0 16px 8px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <LayoutGrid size={13} color={C.primary} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                    Sodybos <span style={{ fontWeight: 400, color: C.textSec }}>({displayVietos.length})</span>
                  </span>
                  <div style={{ marginLeft: 'auto' }}>
                    <VietaStatusFilter value={vietaStatusFilter} onChange={setVietaStatusFilter} vietos={vietos} compact />
                  </div>
                </div>
              )}
              {sheetOpen && (
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {displayVietos.length === 0
                    ? <EmptyState primary={vietos.length === 0} />
                    : <KortelesGrid vietos={displayVietos} selectedId={selectedVieta?.id}
                        onSelect={v => { handleSelectVieta(v); setSheetOpen(false); }} />
                  }
                </div>
              )}
            </div>
          </>
        )}

        {showPanel  && <VietaPanel vieta={selectedVieta} onClose={() => setSelectedVieta(null)} onUpdate={handleUpdateVieta} onDelete={handleDeleteVieta} onLocate={v => { setLocateVieta(v); setSelectedVieta(null); }} mobile />}
        {showForm   && <VietaForm lat={newVietaPos.lat} lng={newVietaPos.lng} onSave={handleSaveVieta} onCancel={() => setNewVietaPos(null)} mobile />}
        {showImport && <SkelbimosImport onSave={async (data) => { await handleAddSkelbimas(data); setShowImport(false); setImportExtracted(null); }} onCancel={() => { setShowImport(false); setImportPickingMap(false); setAddMode(false); setImportExtracted(null); }} onPickOnMap={handleImportPickOnMap} mobile initialUrl={importInitial.url} initialText={importInitial.text} initialExtracted={importExtracted} />}
      </div>
    );
  }

  // ── DESKTOP ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <SodybaMap
        items={mapZones}
        selected={selected}
        onSelect={handleSelectZone}
        userPos={userPos}
        vietos={displayVietos}
        selectedVieta={selectedVieta}
        onVietaSelect={handleSelectVieta}
        addMode={addMode || !!locateVieta}
        addModeHint={locateVieta ? 'Spustelėkite žemėlapyje sodybos vietą' : undefined}
        onMapClick={handleMapClick}
        activeTab={activeTab}
        searchPos={searchPos}
        selectedApskritis={selectedApskritis}
        onApskritisSelect={activeTab === 'vietoves' ? handleApskritisSelect : undefined}
        newVietaPos={newVietaPos}
        sidebarOpen={sidebarOpen}
        ctrlOffset={sidebarOpen ? PANEL_W : 0}
      />

      {!isMobile && (() => {
        const pos = selectedVieta?.lat ? selectedVieta : selected?.lat ? selected : null;
        return pos ? <LithuaniaMiniMap lat={pos.lat} lng={pos.lng} /> : null;
      })()}

      {/* Left panel */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: PANEL_W,
        transform: sidebarOpen ? 'none' : `translateX(-${PANEL_W}px)`,
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 1100, background: 'white',
        boxShadow: '2px 0 8px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
      }}>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            position: 'absolute', top: '50%', right: -24, transform: 'translateY(-50%)',
            width: 24, height: 56, background: 'white', border: 'none',
            borderRadius: '0 10px 10px 0', boxShadow: '2px 0 6px rgba(0,0,0,0.12)',
            cursor: 'pointer', zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            color: C.textSec,
          }}
        >
          <div style={{ width: 3, height: 20, background: '#dadce0', borderRadius: 2 }} />
          {sidebarOpen ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
        </button>

        {/* Header */}
        <div style={{ padding: '12px 16px 10px', flexShrink: 0, borderBottom: `1px solid ${C.outline}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <House size={18} color={C.primary} />
            <span style={{ fontWeight: 600, fontSize: 15, color: C.text }}>Sodybų paieška</span>
          </div>
          <SearchBox onSelect={setSearchPos} />
        </div>

        {/* Tabs — tik 2: Sodybos + Vietovės */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.outline}`, flexShrink: 0 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            const count = tab.id === 'sodybos'
              ? vietos.filter(v => v.statusas !== 'atmesta').length
              : (selectedApskritis ? displayZones.length : null);
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer', background: 'none',
                color: isActive ? C.primary : C.textSec,
                borderBottom: `2px solid ${isActive ? C.primary : 'transparent'}`,
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <Icon size={13} />
                {tab.label}
                {count != null && count > 0 && (
                  <span style={{ background: isActive ? '#e8f0fe' : C.surfaceVar, color: isActive ? C.primary : C.textSec, borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 600 }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        {activeTab === 'sodybos' && (
          <VietaStatusFilter value={vietaStatusFilter} onChange={setVietaStatusFilter} vietos={vietos} />
        )}
        {activeTab === 'vietoves' && (
          <ApskritisBar selectedApskritis={selectedApskritis} count={displayZones.length} onClear={clearApskritis} />
        )}
        {activeTab === 'vietoves' && (
          <ZonuFilters filters={filters} onChange={setFilters} />
        )}

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {activeTab === 'sodybos' && (
            displayVietos.length === 0
              ? <EmptyState primary={vietos.length === 0} />
              : <KortelesGrid vietos={displayVietos} selectedId={selectedVieta?.id} onSelect={handleSelectVieta} />
          )}
          {activeTab === 'vietoves' && selectedApskritis && (
            <>
              {loading && <div style={{ padding: 24, textAlign: 'center', color: C.textTer, fontSize: 13 }}>Kraunama...</div>}
              {!loading && displayZones.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: C.textTer, fontSize: 13 }}>Visos vietovės peržiūrėtos.</div>
              )}
              {displayZones.map(s => (
                <SodybaCard key={s.id} sodyba={s} selected={selected?.id === s.id} onClick={() => handleSelectZone(s)} />
              ))}
            </>
          )}
          {activeTab === 'vietoves' && !selectedApskritis && (
            <div style={{ padding: 24, textAlign: 'center', color: C.textTer, fontSize: 13 }}>
              Spustelėkite apskritį žemėlapyje
            </div>
          )}
        </div>
      </div>

      {/* Right FABs */}
      <div style={{ position: 'absolute', bottom: 24, right: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FabBtn onClick={locateMe} title="Mano vieta"><Navigation size={18} /></FabBtn>
        <FabBtn onClick={() => setAddMode(true)} title="Žymėti sodybą žemėlapyje" primary><MapPin size={18} /></FabBtn>
        <FabBtn onClick={() => { setShowImport(true); setActiveTab('sodybos'); }} title="Importuoti iš skelbimo"><Sparkles size={18} /></FabBtn>
      </div>

      {showImport && <SkelbimosImport onSave={async (data) => { await handleAddSkelbimas(data); setShowImport(false); setImportExtracted(null); }} onCancel={() => { setShowImport(false); setImportPickingMap(false); setAddMode(false); setImportExtracted(null); }} onPickOnMap={handleImportPickOnMap} initialUrl={importInitial.url} initialText={importInitial.text} initialExtracted={importExtracted} />}

      {error && (
        <div style={{ position: 'absolute', top: 0, left: sidebarOpen ? PANEL_W : 0, right: 0, padding: '8px 12px', background: '#fce8e6', color: '#c5221f', fontSize: 12, zIndex: 900 }}>
          Klaida: {error}
        </div>
      )}

      {selected && !newVietaPos && (
        <DetailPanel sodyba={selected} onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange} onAddVieta={() => setAddMode(true)} />
      )}
      {selectedVieta && !newVietaPos && !locateVieta && (
        <VietaPanel vieta={selectedVieta} onClose={() => setSelectedVieta(null)}
          onUpdate={handleUpdateVieta} onDelete={handleDeleteVieta}
          onLocate={(v) => { setLocateVieta(v); setSelectedVieta(null); }} />
      )}
      {newVietaPos && (
        <VietaForm lat={newVietaPos.lat} lng={newVietaPos.lng}
          zonaPavadinimas={selected?.pavadinimas || selected?.adresas}
          onSave={handleSaveVieta} onCancel={() => setNewVietaPos(null)} />
      )}
    </div>
  );
}

// ── SHARED COMPONENTS ────────────────────────────────────────────────────────

function FabBtn({ onClick, title, primary, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 40, height: 40, borderRadius: '50%', border: 'none',
      background: primary ? C.primary : 'white',
      color: primary ? 'white' : C.textSec,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: C.shadowFab,
    }}>
      {children}
    </button>
  );
}

function EmptyState({ primary }) {
  return (
    <div style={{ padding: 32, textAlign: 'center', color: C.textTer, fontSize: 13, lineHeight: 1.6 }}>
      {primary
        ? <>Dar nėra išsaugotų sodybų.<br />Spausk <MapPin size={12} style={{ display: 'inline' }} /> ant žemėlapio arba importuok iš skelbimo.</>
        : 'Nėra pagal filtrą.'}
    </div>
  );
}

function ApskritisBar({ selectedApskritis, count, onClear }) {
  if (!selectedApskritis) return (
    <div style={{ padding: '8px 16px', borderBottom: `1px solid ${C.outline}`, background: C.surfaceVar }}>
      <span style={{ fontSize: 12, color: C.textTer }}>Spustelėkite apskritį žemėlapyje</span>
    </div>
  );
  return (
    <div style={{ padding: '6px 12px', borderBottom: `1px solid ${C.outline}`, background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: C.text }}>
        {selectedApskritis.label} apskritis <span style={{ color: C.textSec }}>({count})</span>
      </span>
      <button onClick={onClear} style={{
        display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px',
        borderRadius: 12, border: `1px solid ${C.primary}`, background: 'white',
        color: C.primary, fontSize: 11, cursor: 'pointer', fontWeight: 500,
      }}>
        <X size={10} /> {selectedApskritis.label}
      </button>
    </div>
  );
}

const TIPAI = [
  { value: '',          label: 'Visi tipai' },
  { value: 'Viensėdis', label: 'Viensėdis' },
  { value: 'Kaimas',    label: 'Kaimas' },
];

function ZonuFilters({ filters, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '6px 12px', borderBottom: `1px solid ${C.outline}`, background: C.surfaceVar, alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={filters.tipas ?? ''} onChange={e => onChange(f => ({ ...f, tipas: e.target.value }))} style={selectStyle}>
        {TIPAI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.textSec }}>
        Max adresai
        <input type="number" min={1} max={50} placeholder="visi" value={filters.maxAdresas ?? ''} onChange={e => onChange(f => ({ ...f, maxAdresas: e.target.value }))}
          style={{ width: 48, padding: '3px 6px', borderRadius: 6, border: `1px solid ${C.outline}`, fontSize: 12, color: C.text }} />
      </label>
    </div>
  );
}

function VietaStatusFilter({ value, onChange, vietos, compact }) {
  const counts = { rasta: 0, skelbimas: 0, aktyvios: 0 };
  VIETA_KEYS.forEach(k => { counts[k] = 0; });
  vietos.forEach(v => {
    const st = v.statusas ?? 'rasta';
    if (st in counts) counts[st]++;
    if (v.saltinis === 'skelbimas') counts.skelbimas++;
    if (v.statusas !== 'atmesta') counts.aktyvios++;
  });

  const options = [
    { key: 'aktyvios',   label: `Aktyvios (${counts.aktyvios})` },
    { key: '',           label: `Visos su atmestomis (${vietos.length})` },
    { key: 'rasta',      label: `Aptiktos (${counts.rasta})` },
    { key: 'skelbimas',  label: `Iš skelbimų (${counts.skelbimas})` },
    ...VIETA_KEYS.map(k => ({ key: k, label: `${VIETA_THEME[k].label} (${counts[k] ?? 0})` })),
  ];

  const handleChange = (e) => {
    if (compact) e.stopPropagation();
    onChange(e.target.value || null);
  };

  if (compact) return (
    <select value={value ?? ''} onChange={handleChange} onClick={e => e.stopPropagation()}
      style={{ padding: '3px 6px', borderRadius: 6, border: `1px solid ${C.outline}`, fontSize: 11, color: C.text, background: 'white', cursor: 'pointer' }}>
      {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );

  return (
    <div style={{ padding: '6px 12px', borderBottom: `1px solid ${C.outline}`, background: C.surfaceVar }}>
      <select value={value ?? ''} onChange={handleChange} style={{ ...selectStyle, width: '100%' }}>
        {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </div>
  );
}

const selectStyle = {
  padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.outline}`,
  fontSize: 12, color: C.text, background: 'white', cursor: 'pointer',
};

function SearchBox({ onSelect }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const debounceRef           = useRef(null);
  const abortRef              = useRef(null);
  const wrapRef               = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    const clean = q.replace(/[()[\]]/g, '').trim();
    const coordMatch = clean.match(/^(-?\d+[.,]\d+)[,\s]+(-?\d+[.,]\d+)$/) ||
                       clean.match(/^(-?\d+)[,\s]+(-?\d+)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1].replace(',', '.'));
      const lng = parseFloat(coordMatch[2].replace(',', '.'));
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        onSelect({ lat, lng }); setOpen(false); return;
      }
    }
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(`/api/geocode-proxy?q=${encodeURIComponent(q)}`, { signal: abortRef.current.signal });
      if (!res.ok) return;
      const data = await res.json();
      setResults(data); setOpen(data.length > 0);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [onSelect]);

  const pick = (r) => {
    onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setQuery(r.display_name.split(',')[0]);
    setOpen(false); setResults([]);
  };

  const getLabel = (r) => {
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
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.surfaceVar, borderRadius: 24, padding: '0 12px', border: `1px solid ${C.outline}` }}>
        <Search size={15} color={C.textSec} />
        <input
          value={query}
          onChange={e => { const q = e.target.value; setQuery(q); clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => search(q), 350); }}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter' && results.length > 0) pick(results[0]); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Ieškoti vietos, kaimo, adreso..."
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: C.text, padding: '9px 0' }}
        />
        {loading && <span style={{ fontSize: 12, color: C.textTer }}>…</span>}
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'white', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 9999, overflow: 'hidden' }}>
          {results.map((r, i) => {
            const { name, parts } = getLabel(r);
            return (
              <div key={r.place_id ?? i} onMouseDown={() => pick(r)}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceVar}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: i < results.length - 1 ? `1px solid ${C.outline}` : 'none', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <MapPin size={14} color={C.textTer} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{name}</div>
                  {parts && <div style={{ fontSize: 11, color: C.textTer }}>{parts}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
