import { useState, useCallback } from 'react';
import SodybaMap from './components/SodybaMap.jsx';
import SodybaCard from './components/SodybaCard.jsx';
import VietaCard from './components/VietaCard.jsx';
import VietaForm from './components/VietaForm.jsx';
import VietaPanel from './components/VietaPanel.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import Filters from './components/Filters.jsx';
import { useSodybaList, updateSodybaStatus } from './hooks/useSodyba.js';
import { useVietos } from './hooks/useVietos.js';
import { TABS } from './lib/theme.js';

export default function App() {
  const [filters, setFilters]       = useState({});
  const [selected, setSelected]     = useState(null);   // selected zone
  const [selectedVieta, setSelectedVieta] = useState(null);
  const [userPos, setUserPos]       = useState(null);
  const [activeTab, setActiveTab]   = useState('browse');
  const [addMode, setAddMode]       = useState(false);
  const [newVietaPos, setNewVietaPos] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPos, setSearchPos]   = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const { items, loading, error, updateItem } = useSodybaList(filters);
  const { vietos, addVieta, updateVieta, deleteVieta } = useVietos();

  // Zone lists per tab
  const displayZones =
    activeTab === 'browse'   ? items.filter(s => s.statusas == null) :
    activeTab === 'ziuretos' ? items.filter(s => s.statusas != null) :
    [];

  const locateMe = useCallback(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setUserPos({ lat, lng });
      setFilters(f => ({ ...f, lat, lng }));
    });
  }, []);

  const handleStatusChange = useCallback(async (id, statusas, komentaras) => {
    updateItem(id, { statusas, komentaras });
    setSelected(s => s?.id === id ? { ...s, statusas, komentaras } : s);
    await updateSodybaStatus(id, statusas, komentaras);
  }, [updateItem]);

  const handleSelectZone = useCallback((s) => {
    setSelected(s);
    setSelectedVieta(null);
    setNewVietaPos(null);
    setAddMode(false);
  }, []);

  const handleSelectVieta = useCallback((v) => {
    setSelectedVieta(v);
    setSelected(null);
    setNewVietaPos(null);
    setAddMode(false);
  }, []);

  const handleMapClick = useCallback((lat, lng) => {
    setAddMode(false);
    setNewVietaPos({ lat, lng });
  }, []);

  const handleSaveVieta = useCallback(async (data) => {
    const vieta = await addVieta({
      ...data,
      gyv_kodas: selected?.gyv_kodas ?? null,
      zonaPavadinimas: selected?.pavadinimas || selected?.adresas || null,
    });
    // Auto-mark zone as žiūrėta
    if (selected && !selected.statusas) {
      handleStatusChange(selected.id, 'ziureta', selected.komentaras ?? null);
    }
    setNewVietaPos(null);
    setSelectedVieta(vieta);
    setSelected(null);
  }, [addVieta, selected, handleStatusChange]);

  const handleUpdateVieta = useCallback(async (id, updates) => {
    await updateVieta(id, updates);
    setSelectedVieta(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  }, [updateVieta]);

  const handleDeleteVieta = useCallback(async (id) => {
    await deleteVieta(id);
    setSelectedVieta(null);
  }, [deleteVieta]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    const coordMatch = q.match(/^(-?\d+[.,]?\d*)[,\s]+(-?\d+[.,]?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1].replace(',', '.'));
      const lng = parseFloat(coordMatch[2].replace(',', '.'));
      setSearchPos({ lat, lng });
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=lt&limit=1`);
      const data = await res.json();
      if (data[0]) setSearchPos({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  // Map receives single selected zone (perf) or all display zones
  const mapZones = selected ? [selected] : (activeTab !== 'atrinktos' ? displayZones : []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ padding: '8px 14px', background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🏡</span>
        <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>Sodybų paieška</span>
        <div style={{ flex: 1, display: 'flex', gap: 6, marginLeft: 8 }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Adresas arba koordinatės..."
            style={{ flex: 1, padding: '5px 10px', borderRadius: 7, border: 'none', fontSize: 13, minWidth: 0, background: '#334155', color: 'white', outline: 'none' }}
          />
          <button onClick={handleSearch} disabled={searchLoading}
            style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#475569', color: 'white', cursor: 'pointer', fontSize: 13 }}>
            {searchLoading ? '…' : '🔍'}
          </button>
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
          {loading ? 'Kraunama...' : activeTab === 'atrinktos' ? `${vietos.length} sod.` : `${displayZones.length} zon.`}
        </span>
        <button onClick={locateMe}
          style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
          📍 Vieta
        </button>
      </header>

      <Filters onApply={setFilters} />

      {error && (
        <div style={{ padding: 12, background: '#fef2f2', color: '#dc2626', fontSize: 13 }}>
          Klaida: {error}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb', flexShrink: 0 }}>
          <Tabs tabs={TABS} active={activeTab} items={items} vietos={vietos} onChange={setActiveTab} />
          {activeTab === 'browse' && (
            <div style={{ padding: '6px 10px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setAddMode(true)}
                style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #2563eb', background: '#dbeafe', color: '#1d4ed8', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                📍 Žymėti sodybą
              </button>
            </div>
          )}

          <div style={{ overflowY: 'auto', flex: 1 }}>

            {activeTab === 'atrinktos' && (
              vietos.length === 0
                ? <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Dar nėra išsaugotų sodybų.<br/>Naršyk zonas ir spausk „Pridėti sodybą".</div>
                : vietos.map(v => (
                    <VietaCard key={v.id} vieta={v} selected={selectedVieta?.id === v.id}
                      onClick={() => handleSelectVieta(v)} />
                  ))
            )}

            {activeTab !== 'atrinktos' && (
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
          <SodybaMap
            items={mapZones}
            selected={selected}
            onSelect={handleSelectZone}
            userPos={userPos}
            vietos={vietos}
            selectedVieta={selectedVieta}
            onVietaSelect={handleSelectVieta}
            addMode={addMode}
            onMapClick={handleMapClick}
            activeTab={activeTab}
            searchPos={searchPos}
          />
          {selected && !newVietaPos && (
            <DetailPanel
              sodyba={selected}
              onClose={() => setSelected(null)}
              onStatusChange={handleStatusChange}
              onAddVieta={() => setAddMode(true)}
            />
          )}
          {selectedVieta && !newVietaPos && (
            <VietaPanel
              vieta={selectedVieta}
              onClose={() => setSelectedVieta(null)}
              onUpdate={handleUpdateVieta}
              onDelete={handleDeleteVieta}
            />
          )}
          {newVietaPos && (
            <VietaForm
              lat={newVietaPos.lat}
              lng={newVietaPos.lng}
              zonaPavadinimas={selected?.pavadinimas || selected?.adresas}
              onSave={handleSaveVieta}
              onCancel={() => { setNewVietaPos(null); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Tabs({ tabs, active, items, vietos, onChange }) {
  const count = (tab) => {
    if (tab.id === 'atrinktos') return vietos.length;
    if (tab.id === 'browse')   return items.filter(s => s.statusas == null).length;
    if (tab.id === 'ziuretos') return items.filter(s => s.statusas != null).length;
    return 0;
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
            {n > 0 && (
              <span style={{ marginLeft: 4, background: '#e2e8f0', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{n}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
