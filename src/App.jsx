import { useState, useCallback } from 'react';
import SodybaMap from './components/SodybaMap.jsx';
import SodybaCard from './components/SodybaCard.jsx';
import Filters from './components/Filters.jsx';
import { useSodybaList } from './hooks/useSodyba.js';

export default function App() {
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);
  const [userPos, setUserPos] = useState(null);

  const { items, loading, error } = useSodybaList(filters);

  const locateMe = useCallback(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setFilters(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ padding: '10px 16px', background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>🏡</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Sodybų paieška</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#94a3b8' }}>
          {loading ? 'Kraunama...' : `${items.length} rastos`}
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
        <div style={{ width: 320, overflowY: 'auto', borderRight: '1px solid #e5e7eb', flexShrink: 0 }}>
          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Kraunama...</div>
          )}
          {!loading && items.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
              Nerasta. Pabandykite sumažinti filtrus.
            </div>
          )}
          {items.map(s => (
            <SodybaCard
              key={s.id}
              sodyba={s}
              selected={selected?.id === s.id}
              onClick={() => setSelected(s)}
            />
          ))}
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <SodybaMap
            items={items}
            selected={selected}
            onSelect={setSelected}
            userPos={userPos}
          />
          {selected && (
            <DetailPanel sodyba={selected} onClose={() => setSelected(null)} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ sodyba: s, onClose }) {
  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16,
      background: 'white', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      padding: 20, width: 280, zIndex: 1000,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          {s.adresas || `${s.lat?.toFixed(4)}, ${s.lng?.toFixed(4)}`}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>×</button>
      </div>

      <Row label="Balas" value={`${s.score ?? '—'} / 100`} bold />
      <Row label="Miškas" value={s.miskas_m === 0 ? '✓ sklype' : s.miskas_m != null ? `${s.miskas_m} m` : '—'} />
      <Row label="Upė/ežeras" value={s.upelis_m === 0 ? '✓ šalia' : s.upelis_m != null ? `${s.upelis_m} m` : '—'} />
      <Row label="Kaimynai 200m" value={s.kaimynai_200m != null ? s.kaimynai_200m : '—'} />
      <Row label="Statymo metai" value={s.pastato_metai ?? '—'} />
      <Row label="Natura 2000" value={s.natura2000 ? '⚠️ taip' : 'ne'} />
      <Row label="Kultūros paveldas" value={s.kultura_paveldas ? '🏛 taip' : 'ne'} />
      <Row label="Saugoma teritorija" value={s.saugomos_terit ? '🌿 taip' : 'ne'} />

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <a
          href={`https://www.geoportal.lt/map/?lat=${s.lat}&lng=${s.lng}&zoom=15`}
          target="_blank" rel="noreferrer"
          style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '8px', fontSize: 13, textDecoration: 'none', color: '#374151' }}
        >
          🗺 Geoportal
        </a>
        <a
          href={`https://maps.google.com/?q=${s.lat},${s.lng}`}
          target="_blank" rel="noreferrer"
          style={{ flex: 1, textAlign: 'center', background: '#f1f5f9', borderRadius: 8, padding: '8px', fontSize: 13, textDecoration: 'none', color: '#374151' }}
        >
          📍 Google Maps
        </a>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}
