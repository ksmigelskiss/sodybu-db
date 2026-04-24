import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
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
      let q = query(collection(db, COL), orderBy('score', 'desc'), limit(200));

      if (filters.minScore) q = query(q, where('score', '>=', filters.minScore));
      if (filters.miskas) q = query(q, where('miskas_m', '!=', null));
      if (filters.upelis) q = query(q, where('upelis_m', '!=', null));
      if (filters.vienkiemis) q = query(q, where('kaimynai_200m', '==', 0));

      const snap = await getDocs(q);
      let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filtruojame pagal atstumą kliento pusėje (paprastas bbox)
      if (filters.lat && filters.lng && filters.radiusKm) {
        const deg = filters.radiusKm / 111;
        docs = docs.filter(s =>
          Math.abs(s.lat - filters.lat) <= deg &&
          Math.abs(s.lng - filters.lng) <= deg * 1.5
        );
      }

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
