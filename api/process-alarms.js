// api/process-alarms.js — Vercel Cron Job: revisa alarmas pendientes y las manda
// Configurar en vercel.json como cron cada minuto

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
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
  try {
    const now = Timestamp.now();
    // Buscar alarmas que deben dispararse ahora
    const snap = await db.collection('scheduled_alarms')
      .where('sent', '==', false)
      .where('fireAt', '<=', now)
      .get();

    const promises = snap.docs.map(async docSnap => {
      const alarm = docSnap.data();
      // Obtener FCM token del usuario
      const tokenSnap = await db.collection('fcm_tokens').doc(alarm.uid).get();
      if (!tokenSnap.exists) return;
      const fcmToken = tokenSnap.data().token;
      try {
        await getMessaging().send({
          token: fcmToken,
          notification: { title: alarm.title, body: alarm.body },
          webpush: {
            notification: {
              title: alarm.title,
              body: alarm.body,
              icon: '/icon-192.png',
              vibrate: [200, 100, 200],
            },
            fcmOptions: { link: 'https://life-tracker-sandy.vercel.app/calendar.html' }
          }
        });
        // Marcar como enviada
        await docSnap.ref.update({ sent: true, sentAt: new Date() });
      } catch (e) {
        console.error('Error sending to', alarm.uid, e.message);
      }
    });

    await Promise.all(promises);
    res.status(200).json({ ok: true, processed: snap.size });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
