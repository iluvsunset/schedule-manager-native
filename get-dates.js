const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const fbSnap = await db.collection('schedules').where('place', '==', 'Tutor Bin').get();
  for (const doc of fbSnap.docs) {
    const data = doc.data();
    console.log(`Event ID: ${doc.id}`);
    console.log(`Start: ${data.date ? data.date.toDate() : 'null'}`);
    console.log(`End: ${data.endDate ? data.endDate.toDate() : 'null'}`);
    console.log('---');
  }
}
run();
