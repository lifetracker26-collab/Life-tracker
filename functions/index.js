const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const webpush = require("web-push");

initializeApp();
const db = getFirestore();

webpush.setVapidDetails(
  "mailto:javi.figueroa.a@gmail.com",
  "BP2Oo-JUV4i1R6VJ1vXeEutlOW6rqUtEoynNmWnkeEOJHYd7PuYpyGTe-XXO4fT2RRawD2E5H_cO6tbOZo9Y-EY",
  "FXr-ymsu4nFFsMwAgiO7cWdqvjY0jysbvRPxReWZnXQ"
);

exports.processAlarms = onSchedule("every 1 minutes", async () => {
  const now = Timestamp.now();
  const snap = await db.collection("scheduled_alarms")
    .where("sent", "==", false)
    .where("fireAt", "<=", now)
    .get();

  const promises = snap.docs.map(async (docSnap) => {
    const alarm = docSnap.data();
    const subSnap = await db.collection("push_subscriptions").doc(alarm.uid).get();
    if (!subSnap.exists) return;
    const subscription = subSnap.data().subscription;
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({title: alarm.title, body: alarm.body || ""})
      );
      await docSnap.ref.update({sent: true, sentAt: new Date()});
    } catch (e) {
      console.error("Error sending to", alarm.uid, e.message);
    }
  });

  await Promise.all(promises);
});
