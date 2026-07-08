require('dotenv').config();
const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const fbSnap = await db.collection('schedules').doc('PHdwPTgSyTKA6Rdwy7UR').get();
  const data = fbSnap.data();
  console.log("Firestore raw date:", data.date.toDate().toISOString());

  // Let's pretend Google Calendar sends back what we sent it
  const googleStr = "2026-07-09T08:00:00Z";
  const start = new Date(googleStr);
  console.log("Parsed from Google:", start.toISOString());
}
run();
