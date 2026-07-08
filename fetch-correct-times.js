require('dotenv').config();
const { admin, getOAuthClient } = require('./server/_utils');
const { google } = require('googleapis');
const db = admin.firestore();

async function run() {
  // KhcRPGlVVETtuvzCS1rXMeow8Rx2 has full calendar.events scope - likely the teacher
  const tokenDoc = (await db.collection('gcal_tokens').doc('KhcRPGlVVETtuvzCS1rXMeow8Rx2').get()).data();
  
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokenDoc);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Fetch upcoming events around Jul 9, 10, 21
  const evRes = await calendar.events.list({
    calendarId: 'primary',
    timeMin: '2026-07-09T00:00:00Z',
    timeMax: '2026-07-22T00:00:00Z',
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50
  });

  console.log("Events found:", evRes.data.items.length);
  for (const ev of evRes.data.items) {
    console.log(`\n${ev.summary}`);
    console.log(`  ID: ${ev.id}`);
    console.log(`  Start: ${ev.start.dateTime || ev.start.date}`);
    console.log(`  End: ${ev.end.dateTime || ev.end.date}`);
  }
}
run();
