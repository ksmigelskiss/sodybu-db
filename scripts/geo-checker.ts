// Batch worker: tikrina geoportal.lt duomenis nepatikrintoms sodyboms
// Paleidžiama: bun src/workers/geo-checker.ts [--limit=50]
import sql from '../db/client.ts';
import { checkSodyba } from '../services/geoportal.ts';
import { score } from '../services/scoring.ts';

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const BATCH = limitArg ? parseInt(limitArg.split('=')[1]) : 20;
const DELAY_MS = 1200; // ~1 rps — nespaminti geoportal.lt

const pending = await sql<{ id: number; lat: number; lng: number; kaimynai_200m: number; kaimynai_500m: number; pastato_metai: number }[]>`
  SELECT id, lat, lng, kaimynai_200m, kaimynai_500m, pastato_metai
  FROM sodyba
  WHERE checked_at IS NULL
  ORDER BY id
  LIMIT ${BATCH}
`;

console.log(`Tikrinsime ${pending.length} sodybų...`);

for (let i = 0; i < pending.length; i++) {
  const s = pending[i];
  process.stdout.write(`[${i + 1}/${pending.length}] id=${s.id} ... `);

  try {
    const geo = await checkSodyba(s.lat, s.lng);
    const { score: sc, details } = score({
      geo,
      kaimynai_200m: s.kaimynai_200m ?? 99,
      kaimynai_500m: s.kaimynai_500m ?? 99,
      pastato_metai: s.pastato_metai,
    });

    await sql`
      UPDATE sodyba SET
        miskas_m = ${geo.miskas_m},
        upelis_m = ${geo.upelis_m},
        natura2000 = ${geo.natura2000},
        saugomos_terit = ${geo.saugomos_terit},
        kultura_paveldas = ${geo.kultura_paveldas},
        szns_raw = ${sql.json(geo.szns_raw)},
        score = ${sc},
        score_details = ${sql.json(details)},
        checked_at = NOW(),
        updated_at = NOW()
      WHERE id = ${s.id}
    `;

    console.log(`score=${sc} miskas=${geo.miskas_m ?? '-'}m upė=${geo.upelis_m ?? '-'}m`);
  } catch (e: any) {
    console.log(`KLAIDA: ${e.message}`);
    // Pažymime kaip tikrinta (kad nekartotume), bet be duomenų
    await sql`UPDATE sodyba SET checked_at = NOW() WHERE id = ${s.id}`;
  }

  if (i < pending.length - 1) {
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
}

console.log('✓ Baigta');
await sql.end();
