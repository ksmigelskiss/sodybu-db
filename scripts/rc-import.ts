import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import proj4 from 'proj4';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../service-account.json'), 'utf-8')
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

proj4.defs('EPSG:3346', '+proj=tmerc +lat_0=0 +lon_0=24 +k=0.9998 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

const BASE = 'https://get.data.gov.lt/datasets/gov/rc/ar';
const HEADERS = { 'Accept': 'application/json' };
const TIKSLINI_TIPAI = new Set(['Viensėdis', 'Kaimas', 'Kaimo dalis']);

// --- 1. Surenka visas gyvenvietes su tipu (paginated) ---
async function fetchSettlements(): Promise<Map<number, { pavadinimas: string; tipas: string }>> {
  const map = new Map<number, { pavadinimas: string; tipas: string }>();
  let cursor: string | null = null;
  let page = 0;

  do {
    const url = `${BASE}/gyvenamojivietove/GyvenamojiVietove?_limit=10000${cursor ? `&_page=${encodeURIComponent(cursor)}` : ''}`;
    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json() as any;
    const items: any[] = data._data ?? [];

    for (const item of items) {
      if (TIKSLINI_TIPAI.has(item.tipas)) {
        map.set(item.gyv_kodas, { pavadinimas: item.pavadinimas, tipas: item.tipas });
      }
    }

    cursor = data._page?.next ?? null;
    page++;
    process.stdout.write(`\r  Gyvenvietės: ${map.size} (puslapis ${page})`);
  } while (cursor);

  return map;
}

// --- 2. Geometrija: centroidas iš WKT POLYGON (LKS94 northing easting → WGS84) ---
function centroid(wkt: string): [number, number] | null {
  try {
    const match = wkt?.match(/POLYGON\s*\(\(([^)]+)\)/);
    if (!match) return null;

    const pts = match[1].split(',').map(p => {
      const parts = p.trim().split(/\s+/).map(Number);
      return [parts[1], parts[0]] as [number, number]; // [easting, northing]
    }).filter(p => isFinite(p[0]) && isFinite(p[1]));

    if (!pts.length) return null;
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    if (!isFinite(cx) || !isFinite(cy)) return null;

    const [lng, lat] = proj4('EPSG:3346', 'EPSG:4326', [cx, cy]);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return [lat, lng];
  } catch {
    return null;
  }
}

// --- 3. Geometrijos su paginacija ---
async function importGeometries(settlements: Map<number, { pavadinimas: string; tipas: string }>) {
  let cursor: string | null = null;
  let inserted = 0;
  let skipped = 0;
  const COL = 'sodyba';
  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;

  do {
    const url = `${BASE}/gragyvenamojivietove/GraGyvenamojiVietove?_limit=10000${cursor ? `&_page=${encodeURIComponent(cursor)}` : ''}`;
    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json() as any;
    const items: any[] = data._data ?? [];

    for (const item of items) {
      const info = settlements.get(item.gyv_kodas);
      if (!info) { skipped++; continue; }

      const coords = centroid(item.gyv_vietoves ?? '');
      if (!coords) { skipped++; continue; }

      const [lat, lng] = coords;
      // Lietuva bbox check
      if (lat < 53.8 || lat > 56.5 || lng < 20.8 || lng > 26.9) { skipped++; continue; }

      const ref = db.collection(COL).doc(`rc_${item.gyv_kodas}`);
      batch.set(ref, {
        gyv_kodas: item.gyv_kodas,
        lat, lng,
        pavadinimas: info.pavadinimas,
        tipas: info.tipas,
        plotas_ha: Math.round(item.plotas / 10000 * 10) / 10,
        saltinis: 'rc_ar',
        score: null,
        checked_at: null,
        created_at: new Date().toISOString(),
      });

      inserted++;
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
        process.stdout.write(`\r  Įrašyta: ${inserted}`);
      }
    }

    cursor = data._page?.next ?? null;
  } while (cursor);

  if (batchCount > 0) await batch.commit();
  return { inserted, skipped };
}

// --- Main ---
console.log('1/3 Kraunamos gyvenvietės iš RC AR...');
const settlements = await fetchSettlements();
console.log(`\n  Viensėdžių/Kaimų: ${settlements.size}`);

console.log('2/3 Valoma sena kolekcija...');
const existing = await db.collection('sodyba').listDocuments();
for (let i = 0; i < existing.length; i += 400) {
  const b = db.batch();
  existing.slice(i, i + 400).forEach(r => b.delete(r));
  await b.commit();
}
console.log(`  Ištrinta: ${existing.length}`);

console.log('3/3 Importuojamos geometrijos...');
const { inserted, skipped } = await importGeometries(settlements);
console.log(`\n✓ Baigta. Įrašyta: ${inserted}, praleista: ${skipped}`);
process.exit(0);
