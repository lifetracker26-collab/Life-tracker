const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const webpush = require('web-push');

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

webpush.setVapidDetails(
  'mailto:javi.figueroa.a@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const db = getFirestore();

module.exports = async function handler(req, res) {
  try {
    const now = Timestamp.now();
    const snap = await db.collection('scheduled_alarms')
      .where('sent', '==', false)
      .where('fireAt', '<=', now)
      .get();

    const promises = snap.docs.map(async docSnap => {
      const alarm = docSnap.data();
      const subSnap = await db.collection('push_subscriptions').doc(alarm.uid).get();
      if (!subSnap.exists) return;
      const subscription = subSnap.data().subscription;
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({ title: alarm.title, body: alarm.body || '' })
        );
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
