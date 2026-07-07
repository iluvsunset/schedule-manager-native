const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const start = new Date('2026-07-09T00:00:00.000Z');
  const end = new Date('2026-07-11T23:59:59.000Z');
  
  const snapshot = await db.collection('schedules')
    .where('date', '>=', start)
    .where('date', '<=', end)
    .get();
    
  console.log(`Found ${snapshot.size} events between July 9 and July 11`);
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
