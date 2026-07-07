const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('schedules').where('place', '==', 'Tutor Bin').get();
  console.log(`Found ${snapshot.size} events matching 'Tutor Bin'`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`Date: ${data.date ? data.date.toDate().toISOString() : 'None'}`);
    console.log(`gcalEventId: ${data.gcalEventId}`);
    console.log(`status: ${data.status}`);
    console.log('---');
  });
}
run();
