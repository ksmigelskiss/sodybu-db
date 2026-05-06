import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

function initAdmin() {
  if (getApps().length) return;
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
  initializeApp({ credential: cert(sa), storageBucket: 'sodybu-db.firebasestorage.app' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url, vietaId } = req.query as Record<string, string>;
  if (!url || !vietaId) return res.status(400).json({ error: 'missing url or vietaId' });

  // Don't re-upload already-Storage URLs
  if (url.includes('firebasestorage.app') || url.includes('storage.googleapis.com')) {
    return res.status(200).json({ url });
  }

  try {
    initAdmin();

    // Download the image server-side (no CORS issues)
    const imgRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!imgRes.ok) return res.status(200).json({ url }); // fallback

    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    const bucket = getStorage().bucket();
    const path = `vietos/${vietaId}/${Date.now()}.${ext}`;
    const file = bucket.file(path);

    await file.save(buffer, {
      metadata: { contentType },
      public: true,
    });

    const publicUrl = `https://storage.googleapis.com/sodybu-db.firebasestorage.app/${path}`;
    return res.status(200).json({ url: publicUrl });
  } catch (e: any) {
    console.error('[cache-photo]', e?.message);
    return res.status(200).json({ url }); // always fallback to original
  }
}
