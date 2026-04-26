// ─── ZONE STATUS THEME ───────────────────────────────────────────────────────
// Zonos (gyvenvietės) turi tik du būsenus:
//   null     = nežiūrėta (žymeklis pagal score)
//   ziureta  = žiūrėta   (žalias ✓)
// Legacy statusai (seni duomenys) paliekami žymekliuose dėl suderinamumo.

export const STATUS_THEME = {
  null:    { marker: { bg: null, text: null } },
  ziureta: {
    label: '✓ Žiūrėta',
    marker: { bg: '#16a34a', text: '✓' },
    card:   { border: '#10b981', bg: '#f0fdf4' },
    btn:    { bg: '#d1fae5', border: '#10b981', color: '#065f46' },
  },
  // Legacy — seni duomenys, rodomi kaip "žiūrėta"
  idomi:   { marker: { bg: '#f59e0b', text: '!' }, card: { border: '#f59e0b', bg: '#fffbeb' } },
  nauja:   { marker: { bg: '#ef4444', text: 'N' }, card: { border: '#ef4444', bg: '#fef2f2' } },
  netinka: { marker: { bg: '#111827', text: '✕' }, card: { border: '#9ca3af', bg: '#f9fafb' } },
};

// ─── VIETA (SODYBA TAŠKAS) THEME ─────────────────────────────────────────────
// Išsaugoti sodybų taškai žemėlapyje su savo statusais.

export const VIETA_THEME = {
  nauja:     { label: '🆕 Nauja',     color: '#ef4444', bg: '#fee2e2' },
  sena:      { label: '🏚 Sena',      color: '#d97706', bg: '#fef3c7' },
  aplankyta: { label: '🚶 Aplankyta', color: '#2563eb', bg: '#dbeafe' },
  atmesta:   { label: '✗ Atmesta',   color: '#6b7280', bg: '#f3f4f6' },
};
export const VIETA_KEYS = ['nauja', 'sena', 'aplankyta', 'atmesta'];

// ─── TABS ─────────────────────────────────────────────────────────────────────
export const TABS = [
  { id: 'atrinktos', label: '⭐ Atrinktos' },
  { id: 'browse',    label: 'Naršyti' },
  { id: 'ziuretos',  label: '✓ Žiūrėtos' },
];
