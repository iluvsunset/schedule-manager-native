const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('schedules').where('userEmail', '==', 'phangiabaoa8@gmail.com').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`Place: ${data.place}`);
    console.log(`Date: ${data.date ? data.date.toDate().toISOString() : 'None'}`);
    console.log(`gcalEventId: ${data.gcalEventId}`);
    console.log('---');
  });
}
run();
