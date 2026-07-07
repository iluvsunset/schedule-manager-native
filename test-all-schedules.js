const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('schedules').get();
  console.log(`Total schedules: ${snapshot.size}`);
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.place && data.place.includes('Tutor Bin')) {
      console.log(`ID: ${doc.id}`);
      console.log(`Place: ${data.place}`);
      console.log(`Date: ${data.date ? data.date.toDate().toISOString() : 'None'}`);
      console.log(`gcalEventId: ${data.gcalEventId}`);
      console.log('---');
    }
  });
}
run();
