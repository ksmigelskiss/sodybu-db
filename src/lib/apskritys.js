export const APSKRITYS = [
  { id: 'alytaus',       label: 'Alytaus',      lat: 54.10, lng: 24.20, bounds: [[53.85, 23.40], [54.55, 25.10]] },
  { id: 'kauno',         label: 'Kauno',        lat: 54.90, lng: 23.95, bounds: [[54.18, 23.25], [55.30, 24.85]] },
  { id: 'klaipedos',    label: 'Klaipėdos',   lat: 55.85, lng: 21.55, bounds: [[55.33, 20.88], [56.45, 22.40]] },
  { id: 'marijampoles',  label: 'Marijampolės', lat: 54.57, lng: 23.10, bounds: [[54.08, 22.44], [54.95, 23.82]] },
  { id: 'paneveziu',    label: 'Panevėžio',   lat: 55.83, lng: 24.55, bounds: [[55.25, 23.78], [56.45, 25.95]] },
  { id: 'siauliu',      label: 'Šiaulių',     lat: 55.90, lng: 23.05, bounds: [[55.43, 21.88], [56.45, 24.55]] },
  { id: 'taurages',     label: 'Tauragės',    lat: 55.30, lng: 22.25, bounds: [[54.82, 21.35], [56.02, 23.18]] },
  { id: 'telsiu',       label: 'Telšių',      lat: 56.00, lng: 22.10, bounds: [[55.62, 21.12], [56.45, 23.12]] },
  { id: 'utenos',       label: 'Utenos',      lat: 55.55, lng: 25.70, bounds: [[54.42, 24.72], [56.10, 26.88]] },
  { id: 'vilniaus',     label: 'Vilniaus',    lat: 54.70, lng: 25.50, bounds: [[54.00, 24.22], [55.52, 26.90]] },
];

export function getApskritis(lat, lng) {
  let best = null, bestDist = Infinity;
  for (const a of APSKRITYS) {
    const dlat = lat - a.lat;
    const dlng = (lng - a.lng) * 0.6;
    const dist = dlat * dlat + dlng * dlng;
    if (dist < bestDist) { bestDist = dist; best = a.id; }
  }
  return best;
}
