const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./service-account.json')) });
const db = admin.firestore();
const fetch = require('node-fetch');

async function syncAll() {
  const snaps = await db.collection('schedules').get();
  let count = 0;
  for (const doc of snaps.docs) {
    const data = doc.data();
    if (data.className === 'iluvsunset & PGB') {
      try {
        console.log(`Syncing ${doc.id}...`);
        const res = await fetch('https://schedule-iluvsunset.vercel.app/api/sync-event-gcal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduleId: doc.id, schedule: data })
        });
        const result = await res.json();
        console.log(`Result for ${doc.id}:`, result);
        count++;
        // Wait 500ms to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`Error syncing ${doc.id}:`, err.message);
      }
    }
  }
  console.log(`Triggered sync for ${count} schedules.`);
}
syncAll();
