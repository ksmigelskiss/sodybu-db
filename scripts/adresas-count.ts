// Skaičiuoja RC registruotus pastatus kiekvienai gyvenamajai vietovei (per gyv_kodas filter)
// ir rašo adresas_sk į Firestore
import { db, COL } from './firebase-admin.js';

const BASE = 'https://get.data.gov.lt/datasets/gov/rc/ar/pastatas/Pastatas';
const HEADERS = { 'Accept': 'application/json' };
const CONCURRENCY = 4;

async function fetchWithRetry(url: string, retries = 5): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      if (attempt === retries) throw new Error(`HTTP ${res.status} after ${retries} retries`);
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    throw new Error(`HTTP ${res.status}`);
  }
}

async function countBuildings(gyv_kodas: number): Promise<number> {
  let total = 0;
  let cursor: string | null = null;
  do {
    const url = `${BASE}?gyvenamoji_vietove.gyv_kodas=${gyv_kodas}&_limit=10000&select(nr)${cursor ? `&_page=${encodeURIComponent(cursor)}` : ''}`;
    const data = await fetchWithRetry(url);
    total += (data._data ?? []).length;
    cursor = data._page?.next ?? null;
  } while (cursor);
  return total;
}

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

(async () => {
  console.log('1. Kraunami settlement\'ai iš Firestore...');
  const snap = await db.collection(COL).get();
  const docs = snap.docs;
  console.log(`   Dokumentų: ${docs.length}`);

  let done = 0;
  let updated = 0;
  let batchQueue: { ref: FirebaseFirestore.DocumentReference; sk: number }[] = [];

  async function flushBatch() {
    if (!batchQueue.length) return;
    const b = db.batch();
    for (const { ref, sk } of batchQueue) b.update(ref, { adresas_sk: sk });
    await b.commit();
    batchQueue = [];
  }

  const resume = process.argv.includes('--resume');
  if (resume) console.log('   Resume mode: praleisim jau turimus adresas_sk');

  const tasks = docs.map(d => async () => {
    const gyv_kodas = d.data().gyv_kodas as number | undefined;
    if (!gyv_kodas) { done++; return; }
    if (resume && d.data().adresas_sk != null) { done++; return; }

    const sk = await countBuildings(gyv_kodas);
    const current = d.data().adresas_sk ?? null;

    if (sk !== current) {
      batchQueue.push({ ref: d.ref, sk });
      updated++;
      if (batchQueue.length >= 400) await flushBatch();
    }

    done++;
    if (done % 50 === 0) process.stdout.write(`\r  ${done}/${docs.length} patikrinta, ${updated} atnaujinta...`);
  });

  console.log(`2. Skaičiuojame pastatus (${CONCURRENCY} lygiagrečiai)...`);
  await runWithConcurrency(tasks, CONCURRENCY);
  await flushBatch();

  console.log(`\n   Atnaujinta: ${updated} dokumentų`);
  console.log('Baigta.');
  process.exit(0);
})();
