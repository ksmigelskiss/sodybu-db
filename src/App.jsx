import { useState, useCallback } from 'react';
import SodybaMap from './components/SodybaMap.jsx';
import SodybaCard from './components/SodybaCard.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import Filters from './components/Filters.jsx';
import { useSodybaList, updateSodybaStatus } from './hooks/useSodyba.js';
import { TABS } from './lib/theme.js';

export default function App() {
  const [filters, setFilters]   = useState({});
  const [selected, setSelected] = useState(null);
  const [userPos, setUserPos]   = useState(null);
  const [activeTab, setActiveTab] = useState('browse');

  const { items, loading, error, updateItem } = useSodybaList(filters);

  const displayItems = items.filter(s => {
    if (activeTab === 'idomi')   return s.statusas === 'idomi';
    if (activeTab === 'nauja')   return s.statusas === 'nauja';
    if (activeTab === 'ziureta') return s.statusas === 'ziureta';
    return s.statusas !== 'netinka';
  });

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ padding: '10px 16px', background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>🏡</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Sodybų paieška</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#94a3b8' }}>
          {loading ? 'Kraunama...' : `${displayItems.length} rodomos`}
        </span>
        <button onClick={locateMe}
          style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
          📍 Mano vieta
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
          <Tabs tabs={TABS} active={activeTab} items={items} onChange={setActiveTab} />
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Kraunama...</div>}
            {!loading && displayItems.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                {activeTab === 'browse' ? 'Nerasta. Sumažinkite filtrus.' : 'Dar nėra pažymėtų.'}
              </div>
            )}
            {displayItems.map(s => (
              <SodybaCard key={s.id} sodyba={s} selected={selected?.id === s.id} onClick={() => setSelected(s)} />
            ))}
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <SodybaMap items={displayItems} selected={selected} onSelect={setSelected} userPos={userPos} />
          {selected && (
            <DetailPanel sodyba={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />
          )}
        </div>
      </div>
    </div>
  );
}

function Tabs({ tabs, active, items, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
      {tabs.map(tab => {
        const count = tab.id === 'browse'
          ? items.filter(s => s.statusas !== 'netinka').length
          : items.filter(s => s.statusas === tab.id).length;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{
            flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: active === tab.id ? 'white' : '#f8fafc',
            color: active === tab.id ? '#1e293b' : '#64748b',
            borderBottom: active === tab.id ? '2px solid #2563eb' : '2px solid transparent',
          }}>
            {tab.label}
            {tab.id !== 'browse' && count > 0 && (
              <span style={{ marginLeft: 4, background: '#e2e8f0', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
