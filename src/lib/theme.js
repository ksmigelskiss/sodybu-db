// ─── STATUS THEME ────────────────────────────────────────────────────────────
// Viena vieta keisti visas spalvas, ikonas ir etiketes pagal statusą.
// Kiekvienas statusas turi:
//   label      — mygtuko tekstas
//   marker     — žemėlapio žymeklio { bg, color, text }
//   card       — sąrašo kortelės { border, bg }
//   btn        — aktyvaus mygtuko { bg, border, color }

export const STATUS_THEME = {
  // ── Nepažymėta (default) ───────────────────────────────────────────────────
  null: {
    marker: { bg: null, color: 'white', text: null }, // score-based, see makeMarkerIcon
  },

  // ── Atrinkta ──────────────────────────────────────────────────────────────
  idomi: {
    label: '⭐ Atrinkta',
    marker: { bg: '#f59e0b', color: 'white', text: '!' },
    card:   { border: '#f59e0b', bg: '#fffbeb' },
    btn:    { bg: '#fef3c7', border: '#f59e0b', color: '#92400e' },
  },

  // ── Nauja ─────────────────────────────────────────────────────────────────
  nauja: {
    label: '🆕 Nauja',
    marker: { bg: '#ef4444', color: 'white', text: 'N' },
    card:   { border: '#ef4444', bg: '#fef2f2' },
    btn:    { bg: '#fee2e2', border: '#ef4444', color: '#7f1d1d' },
  },

  // ── Netinka ───────────────────────────────────────────────────────────────
  netinka: {
    label: '✗ Netinka',
    marker: { bg: '#111827', color: 'white', text: '✕' },
    card:   { border: '#9ca3af', bg: '#f9fafb' },
    btn:    { bg: '#f1f5f9', border: '#94a3b8', color: '#475569' },
  },

  // ── Žiūrėta ───────────────────────────────────────────────────────────────
  ziureta: {
    label: '✓ Žiūrėta',
    marker: { bg: '#16a34a', color: 'white', text: '✓' },
    card:   { border: '#10b981', bg: '#f0fdf4' },
    btn:    { bg: '#d1fae5', border: '#10b981', color: '#065f46' },
  },
};

// Statuso sąrašas (tvarka mygtukuose ir tab'uose)
export const STATUS_KEYS = ['idomi', 'nauja', 'netinka', 'ziureta'];

// Tab'ų konfigūracija
export const TABS = [
  { id: 'idomi',   label: '⭐ Atrinktos' },
  { id: 'browse',  label: 'Naršyti' },
  { id: 'nauja',   label: '🆕 Naujos' },
  { id: 'ziureta', label: '✓ Žiūrėtos' },
];
