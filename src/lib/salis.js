// Country / šalis utilities

export const SALYS = [
  { code: 'lt', flag: '🇱🇹', label: 'Lietuva' },
  { code: 'es', flag: '🇪🇸', label: 'Ispanija' },
  { code: 'pt', flag: '🇵🇹', label: 'Portugalija' },
  { code: 'hr', flag: '🇭🇷', label: 'Kroatija' },
  { code: 'fr', flag: '🇫🇷', label: 'Prancūzija' },
  { code: 'gr', flag: '🇬🇷', label: 'Graikija' },
  { code: 'it', flag: '🇮🇹', label: 'Italija' },
  { code: 'de', flag: '🇩🇪', label: 'Vokietija' },
  { code: 'bg', flag: '🇧🇬', label: 'Bulgarija' },
  { code: 'me', flag: '🇲🇪', label: 'Juodkalnija' },
  { code: 'al', flag: '🇦🇱', label: 'Albanija' },
  { code: 'other', flag: '🌍', label: 'Kita' },
];

// Known portal domains → country code
const DOMAIN_MAP = {
  'idealista.com':          'es',
  'fotocasa.es':            'es',
  'habitaclia.com':         'es',
  'pisos.com':              'es',
  'idealista.pt':           'pt',
  'imovirtual.com':         'pt',
  'casa.sapo.pt':           'pt',
  'supercasa.pt':           'pt',
  'njuskalo.hr':            'hr',
  'oglasi.hr':              'hr',
  'index.hr':               'hr',
  'seloger.com':            'fr',
  'leboncoin.fr':           'fr',
  'logic-immo.com':         'fr',
  'bienici.com':            'fr',
  'rightmove.co.uk':        'gb',
  'zoopla.co.uk':           'gb',
  'onthemarket.com':        'gb',
  'immobilienscout24.de':   'de',
  'immonet.de':             'de',
  'immowelt.de':            'de',
  'spitogatos.gr':          'gr',
  'xe.gr':                  'gr',
  'immobiliare.it':         'it',
  'casa.it':                'it',
  'subito.it':              'it',
  'history.bg':             'bg',
  'imoti.net':              'bg',
};

// ccTLD → country code
const TLD_MAP = {
  'es': 'es', 'pt': 'pt', 'hr': 'hr', 'fr': 'fr',
  'gr': 'gr', 'it': 'it', 'de': 'de', 'bg': 'bg',
  'me': 'me', 'al': 'al',
};

// Domains that look foreign but are actually LT/adjacent
const LT_DOMAINS = new Set(['ss.lv', 'city24.lv', 'brokalys.lv', 'city24.lt',
  'aruodas.lt', 'skelbiu.lt', 'domoplius.lt', 'kampas.lt', 'remax.lt', 'inreal.lt']);

export function detectSalis(domain) {
  if (!domain) return 'lt';
  if (LT_DOMAINS.has(domain) || domain.endsWith('.lt') || domain.endsWith('.lv') || domain.endsWith('.ee')) return 'lt';
  if (DOMAIN_MAP[domain]) return DOMAIN_MAP[domain];
  const tld = domain.split('.').pop().toLowerCase();
  return TLD_MAP[tld] ?? 'other';
}

export function salisInfo(code) {
  return SALYS.find(s => s.code === code) ?? { code: 'other', flag: '🌍', label: 'Kita' };
}

export const isLt = (v) => !v.salis || v.salis === 'lt';
export const isForeign = (v) => !isLt(v);
