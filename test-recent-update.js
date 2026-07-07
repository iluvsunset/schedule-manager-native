const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  // Let's get any schedule updated recently (since the user tried to fix it)
  // We'll just dump all events and check their 'updatedAt' field, if it exists.
  const snapshot = await db.collection('schedules').where('userEmail', '==', 'phangiabaoa8@gmail.com').get();
  let found = false;
  const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.updatedAt && data.updatedAt.toMillis() > fiveMinsAgo) {
      console.log(`UPDATED RECENTLY: ${doc.id} - ${data.place}`);
      found = true;
    }
  });
  if (!found) console.log('No events updated in the last 5 minutes.');
}
run();
