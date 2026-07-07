const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const start = new Date('2026-07-06T00:00:00.000Z');
  const end = new Date('2026-07-16T00:00:00.000Z');
  
  const snapshot = await db.collection('schedules')
    .where('date', '>=', start)
    .where('date', '<=', end)
    .get();
    
  console.log(`Found ${snapshot.size} events between July 6 and July 16`);
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
