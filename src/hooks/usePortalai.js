import { useState, useEffect, useCallback, useRef } from 'react';
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
  try {
    const parts = new URL(url).hostname.split('.');
    // Strip known mobile/www subdomains only when a real domain remains (≥2 parts left)
    if (parts.length >= 3 && /^(www|m|mobile|wap)$/i.test(parts[0])) {
      return parts.slice(1).join('.');
    }
    return parts.join('.');
  } catch { return null; }
}

export function usePortalai() {
  const [portalai, setPortalai] = useState([]);
  const [loading, setLoading]   = useState(true);
  // Ref to current portalai for synchronous checks inside async callbacks
  const portalaiRef = useRef([]);

  const setPortalaiAndRef = useCallback((updater) => {
    setPortalai(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      portalaiRef.current = next;
      return next;
    });
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COL));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      portalaiRef.current = list;
      setPortalai(list);
    } catch (e) {
      console.error('[portalai] fetchAll failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addPortalas = useCallback(async (data) => {
    const ref = await addDoc(collection(db, COL), { ...data, created_at: serverTimestamp() });
    const p = { id: ref.id, ...data, created_at: new Date() };
    setPortalaiAndRef(prev => [...prev, p]);
    return p;
  }, [setPortalaiAndRef]);

  const updatePortalas = useCallback(async (id, updates) => {
    await updateDoc(doc(db, COL, id), updates);
    setPortalaiAndRef(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [setPortalaiAndRef]);

  const deletePortalas = useCallback(async (id) => {
    await deleteDoc(doc(db, COL, id));
    setPortalaiAndRef(prev => prev.filter(p => p.id !== id));
  }, [setPortalaiAndRef]);

  // Called automatically when a listing with a URL is saved.
  // Uses portalaiRef for a synchronous local check before hitting Firestore.
  const ensurePortal = useCallback(async (url) => {
    const domain = extractDomain(url);
    if (!domain) return;

    // Fast synchronous check via ref — skip if already tracked locally
    if (portalaiRef.current.some(p => p.domain === domain)) return;

    try {
      // Authoritative Firestore check (handles multi-tab / race conditions)
      const snap = await getDocs(query(collection(db, COL), where('domain', '==', domain)));
      if (!snap.empty) {
        const p = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setPortalaiAndRef(prev => prev.some(x => x.id === p.id) ? prev : [...prev, p]);
        return;
      }

      // New portal — create with known metadata if available
      const meta = KNOWN[domain] ?? {};
      const docData = {
        domain,
        pavadinimas: meta.pavadinimas ?? domain,
        aprasymas:   meta.aprasymas   ?? null,
        regionas:    meta.regionas    ?? 'other',
        saltinis:    'auto',
        searchUrl:   null,
        pastaba:     null,
        logo:        `https://${domain}/favicon.ico`,
        created_at:  serverTimestamp(),
      };
      const ref = await addDoc(collection(db, COL), docData);
      const p = {
        id: ref.id,
        domain,
        pavadinimas: meta.pavadinimas ?? domain,
        aprasymas:   meta.aprasymas   ?? null,
        regionas:    meta.regionas    ?? 'other',
        saltinis:    'auto',
        searchUrl:   null,
        pastaba:     null,
        logo:        `https://${domain}/favicon.ico`,
        created_at:  new Date(),
      };
      setPortalaiAndRef(prev => [...prev, p]);
      console.log('[portalai] created:', domain);
    } catch (e) {
      console.error('[portalai] ensurePortal failed for', domain, ':', e);
    }
  }, [setPortalaiAndRef]);

  return { portalai, loading, addPortalas, updatePortalas, deletePortalas, ensurePortal, refresh: fetchAll };
}
