const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const webpush = require("web-push");

initializeApp();
const db = getFirestore();

webpush.setVapidDetails(
  "mailto:javi.figueroa.a@gmail.com",
  "BE1oQqS41xWtH4UNP4840PQYM4qwIKQch6AxRmi21QqyaK4o87Uaf7oyXf_ub6bUZXhIuSGnteg2QwKqyz3KgdQ",
  "QmjfO-Hv6VGzjIeR52meHWtvyqeMhCC91oe_qZi55M8"
);

exports.processAlarms = onSchedule("every 1 minutes", async () => {
  try {
    const now = Timestamp.now();
    console.log("processAlarms running, now:", now.toDate().toISOString());
    
    const snap = await db.collection("scheduled_alarms")
      .where("sent", "==", false)
      .where("fireAt", "<=", now)
      .get();

    console.log("Alarmas pendientes encontradas:", snap.size);

    const promises = snap.docs.map(async (docSnap) => {
      const alarm = docSnap.data();
      console.log("Procesando alarma:", alarm.title, "uid:", alarm.uid);
      
      const subSnap = await db.collection("push_subscriptions").doc(alarm.uid).get();
      if (!subSnap.exists) {
        console.log("No hay suscripción para uid:", alarm.uid);
        return;
      }
      
      const subscription = subSnap.data().subscription;
      console.log("Enviando push a endpoint:", subscription.endpoint ? subscription.endpoint.substring(0,50) : "sin endpoint");
      
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({title: alarm.title, body: alarm.body || ""})
        );
        console.log("Push enviado exitosamente");
        await docSnap.ref.update({sent: true, sentAt: new Date()});
      } catch (e) {
        console.error("Error enviando push:", e.message, "statusCode:", e.statusCode);
      }
    });

    await Promise.all(promises);
  } catch (e) {
    console.error("Error en processAlarms:", e.message);
  }
});
