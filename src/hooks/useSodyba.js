import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

const COL = 'sodyba';

export function useSodybaList(filters = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Firestore query — filtruojame kas galima serverio pusėje
      let constraints = [orderBy('tipas'), limit(10000)];

      if (filters.tipas) {
        constraints = [where('tipas', '==', filters.tipas), orderBy('tipas'), limit(10000)];
      }

      const snap = await getDocs(query(collection(db, COL), ...constraints));
      let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Kliento pusės filtrai
      if (filters.miskas)  docs = docs.filter(s => s.miskas_m != null);
      if (filters.upelis)  docs = docs.filter(s => s.upelis_m != null);
      if (filters.maxAdresas) docs = docs.filter(s => s.adresas_sk != null && s.adresas_sk <= Number(filters.maxAdresas));

      if (filters.lat && filters.lng && filters.radiusKm) {
        const deg = filters.radiusKm / 111;
        docs = docs.filter(s =>
          Math.abs(s.lat - filters.lat) <= deg &&
          Math.abs(s.lng - filters.lng) <= deg * 1.5
        );
      }

      // Rūšiuojame: score DESC, tada pavadinimas
      docs.sort((a, b) => {
        if (a.score != null && b.score != null) return b.score - a.score;
        if (a.score != null) return -1;
        if (b.score != null) return 1;
        return (a.pavadinimas || '').localeCompare(b.pavadinimas || '');
      });

      setItems(docs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, reload: load };
}

export function useSodybaDetail(id) {
  const [sodyba, setSodyba] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, COL, id))
      .then(d => setSodyba(d.exists() ? { id: d.id, ...d.data() } : null))
      .finally(() => setLoading(false));
  }, [id]);

  return { sodyba, loading };
}

export async function checkPoint(lat, lng) {
  const res = await fetch('/api/geo-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng }),
  });
  if (!res.ok) throw new Error(`proxy: ${res.status}`);
  return res.json();
}
