const APSKRITYS = [
  { id: 'alytaus',      label: 'Alytaus',      lat: 54.10, lng: 24.20 },
  { id: 'kauno',        label: 'Kauno',        lat: 54.90, lng: 23.95 },
  { id: 'klaipedos',   label: 'Klaipėdos',   lat: 55.85, lng: 21.55 },
  { id: 'marijampoles', label: 'Marijampolės', lat: 54.57, lng: 23.10 },
  { id: 'paneveziu',   label: 'Panevėžio',   lat: 55.83, lng: 24.40 },
  { id: 'siauliu',     label: 'Šiaulių',     lat: 55.90, lng: 23.05 },
  { id: 'taurages',    label: 'Tauragės',    lat: 55.30, lng: 22.25 },
  { id: 'telsiu',      label: 'Telšių',      lat: 56.00, lng: 22.05 },
  { id: 'utenos',      label: 'Utenos',      lat: 55.40, lng: 25.75 },
  { id: 'vilniaus',    label: 'Vilniaus',    lat: 54.80, lng: 25.45 },
];

export const APSKRITYS_OPTIONS = [
  { value: '', label: 'Visos' },
  ...APSKRITYS.map(a => ({ value: a.id, label: a.label })),
];

export function getApskritis(lat, lng) {
  let best = null, bestDist = Infinity;
  for (const a of APSKRITYS) {
    const dlat = lat - a.lat;
    const dlng = (lng - a.lng) * 0.6; // compress lng due to Lithuania's latitude
    const dist = dlat * dlat + dlng * dlng;
    if (dist < bestDist) { bestDist = dist; best = a.id; }
  }
  return best;
}
