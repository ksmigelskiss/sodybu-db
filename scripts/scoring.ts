import type { GeoCheck } from './geoportal.ts';

export interface ScoreInput {
  geo: GeoCheck;
  kaimynai_200m: number;
  kaimynai_500m: number;
  pastato_metai?: number;
}

export interface ScoreResult {
  score: number;
  details: Record<string, number>;
}

// Kiekvienas kriterijus duoda taškus (maks 100 iš viso)
export function score(input: ScoreInput): ScoreResult {
  const details: Record<string, number> = {};

  // Vienkiemis — 30 taškų
  if (input.kaimynai_200m === 0) details.vienkiemis = 30;
  else if (input.kaimynai_200m <= 2) details.vienkiemis = 15;
  else details.vienkiemis = 0;

  // Miškas šalia — 25 taškų
  if (input.geo.miskas_m === 0) details.miskas = 25;         // sklype/liečia
  else if (input.geo.miskas_m !== null && input.geo.miskas_m < 200) details.miskas = 15;
  else details.miskas = 0;

  // Upė/ežeras šalia — 20 taškų
  if (input.geo.upelis_m === 0) details.upelis = 20;
  else if (input.geo.upelis_m !== null && input.geo.upelis_m < 300) details.upelis = 10;
  else details.upelis = 0;

  // Sena sodyba — 15 taškų
  if (input.pastato_metai && input.pastato_metai < 1960) details.senumas = 15;
  else if (input.pastato_metai && input.pastato_metai < 1980) details.senumas = 8;
  else details.senumas = 0;

  // Saugomos teritorijos — bonus arba penalty
  // (Natura 2000 gali riboti statybą, bet pats gamtovaizdis gražesnis)
  details.saugomos = input.geo.saugomos_terit ? 5 : 0;
  details.kultura = input.geo.kultura_paveldas ? 5 : 0;

  const total = Object.values(details).reduce((a, b) => a + b, 0);

  return { score: Math.min(100, total), details };
}
