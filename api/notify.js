// api/notify.js — Vercel serverless function
// Recibe uid + mensaje y manda push notification via FCM

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { uid, title, body } = req.body;
    if (!uid || !title) return res.status(400).json({ error: 'Missing uid or title' });

    // Obtener FCM token del usuario
    const snap = await db.collection('fcm_tokens').doc(uid).get();
    if (!snap.exists) return res.status(404).json({ error: 'No FCM token found for user' });

    const fcmToken = snap.data().token;

    await getMessaging().send({
      token: fcmToken,
      notification: { title, body: body || '' },
      webpush: {
        notification: {
          title,
          body: body || '',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
        },
        fcmOptions: { link: 'https://life-tracker-sandy.vercel.app/dashboard.html' }
      }
    });

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
