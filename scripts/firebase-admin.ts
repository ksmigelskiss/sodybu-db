// Lokaliam naudojimui (scripts/) — naudoti firebase-admin SDK
// npm install -D firebase-admin
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS!),
    projectId: process.env.FB_PROJECT_ID,
  });
}

export const db = getFirestore();
export const COL = 'sodyba';
