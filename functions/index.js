const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

exports.processAlarms = onSchedule("every 1 minutes", async () => {
  const now = Timestamp.now();
  const snap = await db.collection("scheduled_alarms")
    .where("sent", "==", false)
    .where("fireAt", "<=", now)
    .get();

  const promises = snap.docs.map(async (docSnap) => {
    const alarm = docSnap.data();
    const tokenSnap = await db.collection("fcm_tokens").doc(alarm.uid).get();
    if (!tokenSnap.exists) return;
    const fcmToken = tokenSnap.data().token;
    try {
      await getMessaging().send({
        token: fcmToken,
        notification: {title: alarm.title, body: alarm.body || ""},
        webpush: {
          notification: {
            title: alarm.title,
            body: alarm.body || "",
            icon: "/icon-192.png",
            vibrate: [200, 100, 200],
          },
        },
      });
      await docSnap.ref.update({sent: true, sentAt: new Date()});
    } catch (e) {
      console.error("Error sending to", alarm.uid, e.message);
    }
  });

  await Promise.all(promises);
});
