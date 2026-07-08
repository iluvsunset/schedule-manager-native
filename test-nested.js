require('dotenv').config();
const { admin } = require('./server/_utils');
const db = admin.firestore();
async function run() {
  const fbSnap = await db.collection('schedules').doc('PHdwPTgSyTKA6Rdwy7UR').get();
  const data = fbSnap.data();
  console.log("gcalEventIds structure:", JSON.stringify(data.gcalEventIds, null, 2));
}
run();
