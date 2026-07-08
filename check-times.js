require('dotenv').config();
const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const fbSnap = await db.collection('schedules').where('classId', '==', 'ro3jYXdaSrNogWwpQ57z').get();
  for (const doc of fbSnap.docs) {
    const data = doc.data();
    if (data.date) {
      const date = data.date.toDate();
      const end = data.endDate ? data.endDate.toDate() : null;
      console.log(`Date: ${date.toISOString().split('T')[0]}, Time: ${date.toISOString().split('T')[1].replace('.000Z', '')} - ${end ? end.toISOString().split('T')[1].replace('.000Z', '') : 'N/A'}`);
    }
  }
}
run();
