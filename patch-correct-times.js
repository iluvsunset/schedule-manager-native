require('dotenv').config();
const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  // Jul 9: Tutor Bin 14:00-17:00 +07:00 = 07:00-10:00 UTC
  const jul9Start = new Date('2026-07-09T07:00:00.000Z');
  const jul9End   = new Date('2026-07-09T10:00:00.000Z');

  // Jul 10: Tutor Bin 15:00-17:30 +07:00 = 08:00-10:30 UTC
  const jul10Start = new Date('2026-07-10T08:00:00.000Z');
  const jul10End   = new Date('2026-07-10T10:30:00.000Z');

  // Jul 21: Tutor Bin 14:00-17:00 +07:00 = 07:00-10:00 UTC
  const jul21Start = new Date('2026-07-21T07:00:00.000Z');
  const jul21End   = new Date('2026-07-21T10:00:00.000Z');

  const patches = [
    { id: 'PHdwPTgSyTKA6Rdwy7UR', start: jul9Start,  end: jul9End,   label: 'Jul 9  Mamaboo/Tutor Bin' },
    { id: 'DVvfFm9nqddhMXb3ohqO', start: jul10Start, end: jul10End,  label: 'Jul 10 Tutor Bin' },
    { id: 'VEMYa0CNsuteS8LYo4AS', start: jul21Start, end: jul21End,  label: 'Jul 21 Tutor Bin' },
  ];

  for (const p of patches) {
    await db.collection('schedules').doc(p.id).update({
      date:    admin.firestore.Timestamp.fromDate(p.start),
      endDate: admin.firestore.Timestamp.fromDate(p.end),
    });
    console.log(`✅ Patched ${p.label}: ${p.start.toISOString()} → ${p.end.toISOString()}`);
    console.log(`   (Vietnam: ${p.start.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'})} → ${p.end.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'})})`);
  }

  console.log('\nAll patched! Now triggering GCal sync...');

  // Now trigger gcal sync for each
  const fetch = require('node-fetch');
  for (const p of patches) {
    const docSnap = await db.collection('schedules').doc(p.id).get();
    const scheduleData = docSnap.data();
    const res = await fetch('https://schedule-iluvsunset.vercel.app/api/sync-event-gcal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule: { ...scheduleData, id: p.id }, scheduleId: p.id, action: 'sync' })
    });
    const json = await res.json();
    console.log(`  GCal sync ${p.id}:`, JSON.stringify(json));
  }

  console.log('\nDone!');
}
run();
