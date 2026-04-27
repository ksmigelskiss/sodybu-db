export const STATUS_THEME = {
  null:    { marker: { bg: null, text: null } },
  ziureta: {
    label: 'Žiūrėta',
    marker: { bg: '#137333', text: '✓' },
    card:   { border: '#34a853', bg: '#e6f4ea' },
    btn:    { bg: '#e6f4ea', border: '#34a853', color: '#137333' },
  },
  idomi:   { marker: { bg: '#e37400', text: '!' }, card: { border: '#e37400', bg: '#fef3c7' } },
  nauja:   { marker: { bg: '#c5221f', text: 'N' }, card: { border: '#c5221f', bg: '#fce8e6' } },
  netinka: { marker: { bg: '#5f6368', text: '✕' }, card: { border: '#9aa0a6', bg: '#f1f3f4' } },
};

export const VIETA_THEME = {
  nuvaziuoti: { label: 'Nuvažiuoti', color: '#137333', bg: '#e6f4ea' },
  aplankyta:  { label: 'Aplankyta',  color: '#1a73e8', bg: '#e8f0fe' },
  atmesta:    { label: 'Atmesta',    color: '#5f6368', bg: '#f1f3f4' },
};
export const VIETA_DEFAULT_THEME = { label: 'Rasta', color: '#e37400', bg: '#fef3c7' };
export const VIETA_KEYS = ['nuvaziuoti', 'aplankyta', 'atmesta'];

export function vietaTheme(statusas) {
  return VIETA_THEME[statusas] ?? VIETA_DEFAULT_THEME;
}

export const VIETA_ATTRS = [
  { key: 'upelis',    label: 'Upelis' },
  { key: 'tvenkinys', label: 'Tvenkinys' },
  { key: 'sodas',     label: 'Sodas' },
  { key: 'medziai',   label: 'Medžiai' },
];

export const TABS = [
  { id: 'atrinktos', label: 'Atrinktos' },
  { id: 'browse',    label: 'Vietovės' },
  { id: 'ziuretos',  label: 'Žiūrėtos' },
];
