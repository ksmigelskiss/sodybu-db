import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fetchOsmSodyba } from './osm.ts';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../service-account.json'), 'utf-8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const COL = 'sodyba';

// Išvalom senus duomenis
console.log('Valoma sena kolekcija...');
const existing = await db.collection(COL).listDocuments();
const delChunks = [];
for (let i = 0; i < existing.length; i += 400) delChunks.push(existing.slice(i, i + 400));
for (const chunk of delChunks) {
  const b = db.batch();
  chunk.forEach(ref => b.delete(ref));
  await b.commit();
}
console.log(`Ištrinta: ${existing.length} senų įrašų`);

console.log('Kraunama iš OSM Overpass API (gali užtrukti ~3 min)...');
const sodyba = await fetchOsmSodyba();
console.log(`Rasta kandidatų: ${sodyba.length}`);

let inserted = 0;
const BATCH_SIZE = 400;

for (let i = 0; i < sodyba.length; i += BATCH_SIZE) {
  const chunk = sodyba.slice(i, i + BATCH_SIZE);
  const batch = db.batch();

  for (const s of chunk) {
    const ref = db.collection(COL).doc(`osm_${s.osm_id}`);
    batch.set(ref, {
      osm_id: s.osm_id,
      lat: s.lat,
      lng: s.lng,
      pavadinimas: s.pavadinimas ?? null,
      adresas: s.adresas ?? null,
      pastato_metai: s.pastato_metai ?? null,
      place_type: s.place_type,
      saltinis: 'osm',
      score: null,
      checked_at: null,
      created_at: new Date().toISOString(),
    });
    inserted++;
  }

  await batch.commit();
  process.stdout.write(`\r  Įrašyta: ${Math.min(i + BATCH_SIZE, sodyba.length)}/${sodyba.length}`);
}

console.log(`\n✓ Baigta. Įrašyta: ${inserted}`);
process.exit(0);
