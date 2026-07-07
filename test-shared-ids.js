const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('schedules').where('userEmail', '==', 'phangiabaoa8@gmail.com').get();
  console.log(`Found ${snapshot.size} schedules for phangiabaoa8@gmail.com`);
  let count = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.gcalEventId) {
      count++;
      // check if it's one of the missing dates
      const date = data.date ? data.date.toDate().toISOString() : null;
      if (date && (date.includes('07-09') || date.includes('07-10'))) {
        console.log(`FOUND IN SHARED IDS! Date: ${date}, gcalEventId: ${data.gcalEventId}, Place: ${data.place}`);
      }
    }
  });
  console.log(`Total gcalEventIds: ${count}`);
}
run();
