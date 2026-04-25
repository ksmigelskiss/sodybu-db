// Skaičiuoja registruotus pastatus kiekvienai gyvenamajai vietovei ir rašo adresas_sk į Firestore
import { db, COL } from './firebase-admin.js';

const BASE = 'https://get.data.gov.lt/datasets/gov/rc/ar';
const HEADERS = { 'Accept': 'application/json' };
const LIMIT = 10000;

// 1. UUID → gyv_kodas žemėlapis iš GyvenamojiVietove
async function fetchUuidMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  let cursor: string | null = null;
  let page = 0;

  do {
    const url = `${BASE}/gyvenamojivietove/GyvenamojiVietove?_limit=${LIMIT}${cursor ? `&_page=${encodeURIComponent(cursor)}` : ''}`;
    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json() as any;
    for (const item of (data._data ?? [])) {
      if (item._id && item.gyv_kodas) map.set(item._id, item.gyv_kodas);
    }
    cursor = data._page?.next ?? null;
    page++;
    process.stdout.write(`\r  Gyv. vietovės: ${map.size} (p. ${page})`);
  } while (cursor);

  console.log();
  return map;
}

// 2. Suskaičiuoja pastatus pagal gyv_kodas
async function countBuildings(uuidMap: Map<string, number>): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  let cursor: string | null = null;
  let page = 0;
  let total = 0;

  do {
    const url = `${BASE}/pastatas/Pastatas?_limit=${LIMIT}${cursor ? `&_page=${encodeURIComponent(cursor)}` : ''}`;
    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json() as any;
    const items: any[] = data._data ?? [];

    for (const item of items) {
      const uuid = item.gyvenamoji_vietove?._id;
      if (!uuid) continue;
      const gyvKodas = uuidMap.get(uuid);
      if (gyvKodas) counts.set(gyvKodas, (counts.get(gyvKodas) ?? 0) + 1);
    }

    total += items.length;
    cursor = data._page?.next ?? null;
    page++;
    process.stdout.write(`\r  Pastatai: ${total} (p. ${page}, vietovių: ${counts.size})`);
  } while (cursor);

  console.log();
  return counts;
}

// 3. Atnaujina Firestore adresas_sk lauką
async function updateFirestore(counts: Map<number, number>) {
  const snap = await db.collection(COL).get();
  console.log(`  Firestore dokumentų: ${snap.size}`);

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;
  let updated = 0;

  for (const d of snap.docs) {
    const gyvKodas = d.data().gyv_kodas as number | undefined;
    const sk = gyvKodas != null ? (counts.get(gyvKodas) ?? 0) : null;
    const current = d.data().adresas_sk ?? null;

    if (sk !== current) {
      batch.update(d.ref, { adresas_sk: sk });
      batchCount++;
      updated++;
    }

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
      process.stdout.write(`\r  Atnaujinta: ${updated}`);
    }
  }

  if (batchCount > 0) await batch.commit();
  console.log(`\n  Atnaujinta iš viso: ${updated} dokumentų`);
}

(async () => {
  console.log('1. Traukiame gyv. vietovių UUID žemėlapį...');
  const uuidMap = await fetchUuidMap();

  console.log('2. Skaičiuojame pastatus iš Pastatas...');
  const counts = await countBuildings(uuidMap);

  console.log('3. Atnaujiname Firestore...');
  await updateFirestore(counts);

  console.log('Baigta.');
  process.exit(0);
})();
