const { admin } = require('./server/_utils');
const db = admin.firestore();
const fetch = require('node-fetch');

async function run() {
  // Event 1
  const id1 = 'gcal__612jah1m6sp3cb9j89132b9k84sj4b9p6sq34b9i7514ada26spk4e9g6k';
  const start1 = new Date('2026-07-10T08:00:00.000Z');
  const end1 = new Date(start1.getTime() + 3.5 * 3600000);
  await db.collection('schedules').doc(id1).update({
    date: admin.firestore.Timestamp.fromDate(start1),
    endDate: admin.firestore.Timestamp.fromDate(end1)
  });
  console.log(`Fixed ${id1}`);

  const doc1 = await db.collection('schedules').doc(id1).get();
  await fetch('https://schedule-iluvsunset.vercel.app/api/sync-event-gcal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule: doc1.data(), scheduleId: id1, action: 'sync' })
  });

  // Event 2
  const id2 = 'gcal__8osj2e9k8p0jib9o8gsk6b9k6or3eba2850k2b9i64p46gpm6113ie2288';
  const start2 = new Date('2026-07-09T08:00:00.000Z');
  const end2 = new Date(start2.getTime() + 6.5 * 3600000); // 6.5 hours
  await db.collection('schedules').doc(id2).update({
    date: admin.firestore.Timestamp.fromDate(start2),
    endDate: admin.firestore.Timestamp.fromDate(end2)
  });
  console.log(`Fixed ${id2}`);

  const doc2 = await db.collection('schedules').doc(id2).get();
  await fetch('https://schedule-iluvsunset.vercel.app/api/sync-event-gcal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule: doc2.data(), scheduleId: id2, action: 'sync' })
  });
  
  console.log('Done!');
}
run();
