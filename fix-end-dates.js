require('dotenv').config();
const { admin, getOAuthClient } = require('./server/_utils');
const { google } = require('googleapis');
const db = admin.firestore();

async function run() {
  const tokenDoc = await db.collection('gcal_tokens').doc('PL0gz7PfSbhaYxZVYdcAh0e7gS72').get();
  const tokens = tokenDoc.data();
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const eventIds = [
    '612jah1m6sp3cb9j89132b9k84sj4b9p6sq34b9i7514ada26spk4e9g6k',
    '8osj2e9k8p0jib9o8gsk6b9k6or3eba2850k2b9i64p46gpm6113ie2288'
  ];

  for (const eid of eventIds) {
    const res = await calendar.events.get({ calendarId: 'primary', eventId: eid });
    const gcalStart = new Date(res.data.start.dateTime);
    const gcalEnd = new Date(res.data.end.dateTime);

    console.log(`Event ${eid}:`);
    console.log(`GCal Start: ${gcalStart}`);
    console.log(`GCal End:   ${gcalEnd}`);

    await db.collection('schedules').doc('gcal_' + eid).update({
      date: admin.firestore.Timestamp.fromDate(gcalStart),
      endDate: admin.firestore.Timestamp.fromDate(gcalEnd)
    });
    console.log(`Fixed dates in Firestore!`);
    
    // Now trigger the sync!
    const fetch = require('node-fetch');
    const doc = await db.collection('schedules').doc('gcal_' + eid).get();
    await fetch('https://schedule-iluvsunset.vercel.app/api/sync-event-gcal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule: doc.data(), scheduleId: doc.id, action: 'sync' })
    });
    console.log(`Triggered sync to students!`);
  }
}
run();
