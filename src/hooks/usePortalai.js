import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

const COL = 'portalai';

// Metadata for auto-detected known portals
const KNOWN = {
  'aruodas.lt':   { pavadinimas: 'Aruodas',       aprasymas: 'Didžiausias Lietuvos NT portalas, geras filtravimas', regionas: 'lt' },
  'skelbiu.lt':   { pavadinimas: 'Skelbiu.lt',     aprasymas: 'Privatūs skelbimai, kainos dažnai žemesnės',         regionas: 'lt' },
  'domoplius.lt': { pavadinimas: 'Domoplius',       aprasymas: 'NT portalas su unikaliais skelbimais',               regionas: 'lt' },
  'kampas.lt':    { pavadinimas: 'Kampas.lt',       aprasymas: 'Specializuotas kaimo ir sodybų NT',                  regionas: 'lt' },
  'remax.lt':     { pavadinimas: 'RE/MAX Lietuva',  aprasymas: 'Agentūrų skelbimai',                                 regionas: 'lt' },
  'city24.lt':    { pavadinimas: 'City24.lt',       aprasymas: 'Baltijos šalių NT portalas',                         regionas: 'lt' },
  'inreal.lt':    { pavadinimas: 'Inreal',          aprasymas: 'Vystytojai ir agentūros',                            regionas: 'lt' },
  'ss.lv':        { pavadinimas: 'SS.lv',           aprasymas: 'Latvijos skelbimai, kartais LT prie sienos',         regionas: 'eu' },
  'city24.lv':    { pavadinimas: 'City24.lv',       aprasymas: 'Latvijos NT',                                        regionas: 'eu' },
  'brokalys.lv':  { pavadinimas: 'Brokalys.lv',     aprasymas: 'Latvijos kaimo NT agregatorius',                     regionas: 'eu' },
};

export function extractDomain(url) {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

export function usePortalai() {
  const [portalai, setPortalai] = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COL));
      setPortalai(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addPortalas = useCallback(async (data) => {
    const ref = await addDoc(collection(db, COL), { ...data, created_at: serverTimestamp() });
    const p = { id: ref.id, ...data, created_at: new Date() };
    setPortalai(prev => [...prev, p]);
    return p;
  }, []);

  const updatePortalas = useCallback(async (id, updates) => {
    await updateDoc(doc(db, COL, id), updates);
    setPortalai(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deletePortalas = useCallback(async (id) => {
    await deleteDoc(doc(db, COL, id));
    setPortalai(prev => prev.filter(p => p.id !== id));
  }, []);

  // Called automatically when a listing with a URL is saved.
  // Checks Firestore (not just local state) to avoid race conditions on first load.
  const ensurePortal = useCallback(async (url) => {
    const domain = extractDomain(url);
    if (!domain) return;

    // Fast local check first
    setPortalai(prev => {
      if (prev.some(p => p.domain === domain)) return prev; // already exists
      return prev; // will check Firestore below
    });

    // Authoritative Firestore check
    const snap = await getDocs(query(collection(db, COL), where('domain', '==', domain)));
    if (!snap.empty) {
      const p = { id: snap.docs[0].id, ...snap.docs[0].data() };
      setPortalai(prev => prev.some(x => x.id === p.id) ? prev : [...prev, p]);
      return;
    }

    // New portal — create with known metadata if available, otherwise minimal entry
    const meta = KNOWN[domain] ?? {};
    const ref = await addDoc(collection(db, COL), {
      domain,
      pavadinimas: meta.pavadinimas ?? domain,
      aprasymas:   meta.aprasymas   ?? null,
      regionas:    meta.regionas    ?? 'other',
      saltinis:    'auto',
      searchUrl:   null,
      pastaba:     null,
      logo:        `https://${domain}/favicon.ico`,
      created_at:  serverTimestamp(),
    });
    const p = { id: ref.id, domain, pavadinimas: meta.pavadinimas ?? domain, aprasymas: meta.aprasymas ?? null, regionas: meta.regionas ?? 'other', saltinis: 'auto', searchUrl: null, pastaba: null, logo: `https://${domain}/favicon.ico`, created_at: new Date() };
    setPortalai(prev => [...prev, p]);
  }, []);

  return { portalai, loading, addPortalas, updatePortalas, deletePortalas, ensurePortal, refresh: fetchAll };
}
