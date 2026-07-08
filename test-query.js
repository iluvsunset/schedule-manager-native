require('dotenv').config();
const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const q1 = await db.collection('schedules').where('gcalEventIds.bao.h0146824@gmail.com', '==', '4avqi1oo38ifhbtvtcnd6m49qo').get();
  console.log("Query 1 (Dot notation):", q1.empty ? "Empty" : "Found " + q1.docs.length);

  const q2 = await db.collection('schedules').where(new admin.firestore.FieldPath('gcalEventIds', 'bao.h0146824@gmail.com'), '==', '4avqi1oo38ifhbtvtcnd6m49qo').get();
  console.log("Query 2 (FieldPath flat):", q2.empty ? "Empty" : "Found " + q2.docs.length);

  const q3 = await db.collection('schedules').where(new admin.firestore.FieldPath('gcalEventIds', 'bao', 'h0146824@gmail', 'com'), '==', '4avqi1oo38ifhbtvtcnd6m49qo').get();
  console.log("Query 3 (FieldPath nested):", q3.empty ? "Empty" : "Found " + q3.docs.length);
}
run();
