const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('schedules')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
    
  console.log(`Found ${snapshot.size} recent events`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`Place: ${data.place}`);
    console.log(`Date: ${data.date ? data.date.toDate().toISOString() : 'None'}`);
    console.log(`gcalEventId: ${data.gcalEventId}`);
    console.log(`createdAt: ${data.createdAt ? data.createdAt.toDate().toISOString() : 'None'}`);
    console.log('---');
  });
}
run();
