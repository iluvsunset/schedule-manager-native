const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./service-account.json')) });
const db = admin.firestore();

const TARGET_EMAIL = 'bao.h0146824@gmail.com';
const API = 'https://schedule-iluvsunset.vercel.app/api/sync-event-gcal';

async function forceSyncForUser() {
  console.log(`\n🔄 Force-syncing all schedules for: ${TARGET_EMAIL}\n`);

  const snaps = await db.collection('schedules')
    .where('participants', 'array-contains', TARGET_EMAIL)
    .get();

  console.log(`Found ${snaps.size} schedules to re-sync.\n`);

  let success = 0;
  let failed = 0;

  for (const doc of snaps.docs) {
    const data = doc.data();
    const dateStr = data.date ? data.date.toDate().toISOString() : 'unknown';
    const endStr = data.endDate ? data.endDate.toDate().toISOString() : 'none';

    try {
      process.stdout.write(`  [${doc.id}] ${data.place} (${dateStr.slice(0,10)}) ... `);

      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // skipEmails: skip all OTHER participants so only bao gets re-synced
        body: JSON.stringify({
          scheduleId: doc.id,
          schedule: data,
          skipEmails: data.participants.filter(e => e !== TARGET_EMAIL)
        })
      });

      const result = await res.json();
      if (result.success) {
        console.log(`✅ synced (${result.syncedCount} calendar(s))`);
        success++;
      } else {
        console.log(`⚠️  partial: ${JSON.stringify(result.errors)}`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ error: ${err.message}`);
      failed++;
    }

    // Throttle to avoid GCal rate limits
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Success: ${success} | ❌ Failed: ${failed} | Total: ${snaps.size}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  process.exit(0);
}

forceSyncForUser().catch(e => { console.error('Fatal error:', e); process.exit(1); });
