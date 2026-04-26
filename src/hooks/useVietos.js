import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

const COL = 'vietos';

export function useVietos() {
  const [vietos, setVietos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, COL));
        setVietos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addVieta = useCallback(async ({ lat, lng, statusas, komentaras, gyv_kodas, zonaPavadinimas, ...rest }) => {
    const data = {
      lat, lng, statusas,
      komentaras: komentaras || null,
      gyv_kodas: gyv_kodas || null,
      zonaPavadinimas: zonaPavadinimas || null,
      ...rest,
      created_at: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, COL), data);
    const newVieta = { id: ref.id, ...data, created_at: new Date() };
    setVietos(prev => [newVieta, ...prev]);
    return newVieta;
  }, []);

  const updateVieta = useCallback(async (id, updates) => {
    await updateDoc(doc(db, COL, id), updates);
    setVietos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  }, []);

  const deleteVieta = useCallback(async (id) => {
    await deleteDoc(doc(db, COL, id));
    setVietos(prev => prev.filter(v => v.id !== id));
  }, []);

  return { vietos, loading, addVieta, updateVieta, deleteVieta };
}
