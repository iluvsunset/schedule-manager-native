require('dotenv').config();
const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  // Let's see if there's any history or previous versions of the schedules
  const fbSnap = await db.collection('schedules').where('classId', '==', 'ro3jYXdaSrNogWwpQ57z').get();
  for (const doc of fbSnap.docs) {
    const data = doc.data();
    if (data.date) {
      const date = data.date.toDate();
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      if ([9, 10, 21].includes(day) && month === 7 && year === 2026) {
        console.log(`Doc ID: ${doc.id}`);
        console.log(`  Current Time: ${date.toISOString()}`);
        console.log(`  Notes: ${data.notes}`);
        // Let's see if we have history array or anything
        console.log(`  Keys: ${Object.keys(data).join(', ')}`);
      }
    }
  }
}
run();
