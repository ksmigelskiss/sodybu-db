import { STATUS_THEME, STATUS_KEYS } from './theme.js';

export { STATUS_THEME as STATUSES, STATUS_KEYS };

export function statusCardStyle(statusas, selected) {
  const th = STATUS_THEME[statusas];
  return {
    background: selected ? '#f0f7ff' : (th?.card?.bg ?? 'white'),
    borderLeft: `3px solid ${selected ? '#2563eb' : (th?.card?.border ?? 'transparent')}`,
    opacity: statusas === 'netinka' ? 0.5 : 1,
  };
}

export function statusBtnStyle(current, target) {
  const th = STATUS_THEME[target];
  return current === target
    ? { background: th.btn.bg, borderColor: th.btn.border, color: th.btn.color }
    : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#374151' };
}
