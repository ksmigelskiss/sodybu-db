export const STATUSES = {
  idomi:   { label: '⭐ Įdomi',   border: '#f59e0b', bg: '#fffbeb', activeBg: '#fef3c7', activeColor: '#92400e' },
  nauja:   { label: '🆕 Nauja',   border: '#8b5cf6', bg: '#f5f3ff', activeBg: '#ede9fe', activeColor: '#4c1d95' },
  netinka: { label: '✗ Netinka', border: '#9ca3af', bg: '#f9fafb', activeBg: '#f1f5f9', activeColor: '#475569' },
  ziureta: { label: '✓ Žiūrėta', border: '#10b981', bg: '#f0fdf4', activeBg: '#d1fae5', activeColor: '#065f46' },
};

export function statusCardStyle(statusas, selected) {
  const st = STATUSES[statusas];
  return {
    background: selected ? '#f0f7ff' : (st?.bg ?? 'white'),
    borderLeft: `3px solid ${selected ? '#2563eb' : (st?.border ?? 'transparent')}`,
    opacity: statusas === 'netinka' ? 0.5 : 1,
  };
}

export function statusBtnStyle(current, target) {
  const st = STATUSES[target];
  return current === target
    ? { background: st.activeBg, borderColor: st.border, color: st.activeColor }
    : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#374151' };
}
