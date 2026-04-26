import { useState, useCallback } from 'react';
import SodybaMap from './components/SodybaMap.jsx';
import SodybaCard from './components/SodybaCard.jsx';
import Filters from './components/Filters.jsx';
import { useSodybaList, updateSodybaStatus } from './hooks/useSodyba.js';

const TABS = [
  { id: 'browse', label: 'Naršyti' },
  { id: 'idomi',  label: '⭐ Įdomios' },
  { id: 'ziureta', label: '✓ Žiūrėtos' },
];

export default function App() {
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [activeTab, setActiveTab] = useState('browse');

  const { items, loading, error, updateItem } = useSodybaList(filters);

  const displayItems = items.filter(s => {
    if (activeTab === 'idomi')   return s.statusas === 'idomi';
    if (activeTab === 'ziureta') return s.statusas === 'ziureta';
    return s.statusas !== 'netinka';
  });

  const locateMe = useCallback(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setFilters(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
    });
  }, []);

  const handleStatusChange = useCallback(async (id, statusas, komentaras) => {
    updateItem(id, { statusas, komentaras });
    if (selected?.id === id) setSelected(s => ({ ...s, statusas, komentaras }));
    await updateSodybaStatus(id, statusas, komentaras);
  }, [selected, updateItem]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ padding: '10px 16px', background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>🏡</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Sodybų paieška</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#94a3b8' }}>
          {loading ? 'Kraunama...' : `${displayItems.length} rodomos`}
        </span>
        <button
          onClick={locateMe}
          style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
        >
          📍 Mano vieta
        </button>
      </div>

      <Filters onApply={setFilters} />

      {error && (
        <div style={{ padding: 12, background: '#fef2f2', color: '#dc2626', fontSize: 13 }}>
          Klaida: {error}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb', flexShrink: 0 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
            {TABS.map(tab => {
              const count = tab.id === 'browse'
                ? items.filter(s => s.statusas !== 'netinka').length
                : items.filter(s => s.statusas === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: activeTab === tab.id ? 'white' : '#f8fafc',
                    color: activeTab === tab.id ? '#1e293b' : '#64748b',
                    borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                  }}
                >
                  {tab.label}
                  {tab.id !== 'browse' && count > 0 && (
                    <span style={{ marginLeft: 4, background: '#e2e8f0', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Kraunama...</div>}
            {!loading && displayItems.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                {activeTab === 'browse' ? 'Nerasta. Pabandykite sumažinti filtrus.' : 'Dar nėra pažymėtų.'}
              </div>
            )}
            {displayItems.map(s => (
              <SodybaCard
                key={s.id}
                sodyba={s}
                selected={selected?.id === s.id}
                onClick={() => setSelected(s)}
              />
            ))}
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <SodybaMap
            items={displayItems}
            selected={selected}
            onSelect={setSelected}
            userPos={userPos}
          />
          {selected && (
            <DetailPanel
              sodyba={selected}
              onClose={() => setSelected(null)}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ sodyba: s, onClose, onStatusChange }) {
  const [comment, setComment] = useState(s.komentaras || '');
  const [saving, setSaving] = useState(false);

  const handleStatus = async (newStatus) => {
    setSaving(true);
    const status = s.statusas === newStatus ? null : newStatus;
    await onStatusChange(s.id, status, comment || null);
    setSaving(false);
  };

  const handleSaveComment = async () => {
    setSaving(true);
    await onStatusChange(s.id, s.statusas || null, comment || null);
    setSaving(false);
  };

  const btnStyle = (status) => ({
    flex: 1, padding: '7px 4px', border: '1.5px solid',
    borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
    ...(s.statusas === status
      ? STATUS_ACTIVE[status]
      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#374151' }),
  });

  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16,
      background: 'white', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      padding: 20, width: 290, zIndex: 1000,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          {s.pavadinimas || s.adresas || `${s.lat?.toFixed(4)}, ${s.lng?.toFixed(4)}`}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>×</button>
      </div>

      {/* Status buttons */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button style={btnStyle('idomi')}   onClick={() => handleStatus('idomi')}   disabled={saving}>⭐ Įdomi</button>
        <button style={btnStyle('netinka')} onClick={() => handleStatus('netinka')} disabled={saving}>✗ Netinka</button>
        <button style={btnStyle('ziureta')} onClick={() => handleStatus('ziureta')} disabled={saving}>✓ Žiūrėta</button>
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        onBlur={handleSaveComment}
        placeholder="Komentaras..."
        rows={2}
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'vertical',
          border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px',
          fontSize: 12, fontFamily: 'inherit', marginBottom: 10, color: '#374151',
        }}
      />

      <Row label="Balas" value={`${s.score ?? '—'} / 100`} bold />
      <Row label="Tipas" value={s.tipas ?? '—'} />
      <Row label="Pastatai (RC)" value={s.adresas_sk != null ? s.adresas_sk : '—'} />
      <Row label="Plotas" value={s.plotas_ha != null ? `${s.plotas_ha} ha` : '—'} />
      <Row label="Miškas" value={s.miskas_m === 0 ? '✓ sklype' : s.miskas_m != null ? `${s.miskas_m} m` : '—'} />
      <Row label="Upė/ežeras" value={s.upelis_m === 0 ? '✓ šalia' : s.upelis_m != null ? `${s.upelis_m} m` : '—'} />
      <Row label="Kaimynai 200m" value={s.kaimynai_200m != null ? s.kaimynai_200m : '—'} />
      <Row label="Natura 2000" value={s.natura2000 ? '⚠️ taip' : 'ne'} />
      <Row label="Saugoma terit." value={s.saugomos_terit ? '🌿 taip' : 'ne'} />

      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <a href={`https://www.geoportal.lt/map/?lat=${s.lat}&lng=${s.lng}&zoom=15`} target="_blank" rel="noreferrer"
          style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '7px', fontSize: 12, textDecoration: 'none', color: '#374151' }}>
          🗺 Geoportal
        </a>
        <a href={`https://maps.google.com/?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer"
          style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '7px', fontSize: 12, textDecoration: 'none', color: '#374151' }}>
          📍 Google Maps
        </a>
      </div>
    </div>
  );
}

const STATUS_ACTIVE = {
  idomi:   { background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' },
  netinka: { background: '#f1f5f9', borderColor: '#94a3b8', color: '#475569' },
  ziureta: { background: '#d1fae5', borderColor: '#10b981', color: '#065f46' },
};

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}
