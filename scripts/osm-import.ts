// Vienkartinis skriptas: importuoja OSM sodybas į DB
import sql from '../db/client.ts';
import { fetchOsmSodyba } from '../services/osm.ts';

console.log('Kraunama iš OSM Overpass API (gali užtrukti ~2 min)...');

const sodyba = await fetchOsmSodyba();
console.log(`Rasta OSM kandidatų: ${sodyba.length}`);

let inserted = 0;
let skipped = 0;

for (const s of sodyba) {
  try {
    await sql`
      INSERT INTO sodyba (osm_id, lat, lng, adresas, pastato_metai, saltinis)
      VALUES (${s.osm_id}, ${s.lat}, ${s.lng}, ${s.adresas ?? null}, ${s.pastato_metai ?? null}, 'osm')
      ON CONFLICT (osm_id) DO NOTHING
    `;
    inserted++;
  } catch (e) {
    skipped++;
  }
}

console.log(`✓ Įrašyta: ${inserted}, praleista: ${skipped}`);
await sql.end();
