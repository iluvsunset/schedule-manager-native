const { admin } = require('./server/_utils');
const db = admin.firestore();
const fetch = require('node-fetch');

async function run() {
  const fbSnap = await db.collection('schedules').where('place', '==', 'Tutor Bin').get();
  for (const doc of fbSnap.docs) {
    const data = doc.data();
    if (data.exportedGcalEventId || (data.gcalEventIds && Object.keys(data.gcalEventIds).length > 0)) {
      console.log(`Syncing ${doc.id}...`);
      try {
        const res = await fetch('https://schedule-iluvsunset.vercel.app/api/sync-event-gcal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedule: data, scheduleId: doc.id, action: 'sync' })
        });
        const result = await res.json();
        console.log(`Result for ${doc.id}:`, result);
      } catch (err) {
        console.error(`Failed ${doc.id}:`, err);
      }
    }
  }
}
run();
