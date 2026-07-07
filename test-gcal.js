const { admin, getOAuthClient } = require('./server/_utils');
const { google } = require('googleapis');
const db = admin.firestore();

async function run() {
  const users = await db.collection('gcal_tokens').get();
  for (const doc of users.docs) {
    const { refresh_token, access_token } = doc.data();
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ refresh_token, access_token });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const minDate = new Date();
    minDate.setMonth(minDate.getMonth() - 2);
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2);
    
    const eventsRes = await calendar.events.list({
      calendarId: 'primary',
      timeMin: minDate.toISOString(),
      timeMax: maxDate.toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    const events = eventsRes.data.items || [];
    const tutorBinEvents = events.filter(e => e.summary && e.summary.includes('Tutor Bin') && e.start.dateTime && e.start.dateTime.includes('2026-07-09'));
    
    console.log(`User ${doc.id}: Found ${tutorBinEvents.length} events on July 9th`);
    tutorBinEvents.forEach(e => {
      console.log(`Summary: ${e.summary}`);
      console.log(`Start: ${e.start.dateTime}`);
      console.log(`ID: ${e.id}`);
    });
  }
}
run();
