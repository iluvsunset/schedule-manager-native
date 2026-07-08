require('dotenv').config();
const { admin, getOAuthClient } = require('./server/_utils');
const { google } = require('googleapis');
const db = admin.firestore();

async function run() {
  // Try all 3 tokens to find the teacher's
  const tokensSnap = await db.collection('gcal_tokens').get();
  
  for (const doc of tokensSnap.docs) {
    const uid = doc.id;
    const data = doc.data();
    if (!data.refresh_token) continue;
    
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(data);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    try {
      const evRes = await calendar.events.list({
        calendarId: 'primary',
        timeMin: '2026-07-09T00:00:00Z',
        timeMax: '2026-07-22T00:00:00Z',
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50
      });
      
      console.log(`\n=== UID: ${uid} (${evRes.data.items.length} events) ===`);
      for (const ev of evRes.data.items) {
        const start = ev.start.dateTime || ev.start.date;
        const end = ev.end?.dateTime || ev.end?.date;
        console.log(`  [${ev.id}] ${ev.summary}: ${start} → ${end}`);
      }
    } catch(e) {
      console.log(`UID ${uid}: error - ${e.message}`);
    }
  }
}
run();
