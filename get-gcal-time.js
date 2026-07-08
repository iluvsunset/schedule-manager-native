require('dotenv').config();
const { admin, getOAuthClient } = require('./server/_utils');
const { google } = require('googleapis');
const db = admin.firestore();

async function run() {
  const ts = await db.collection('gcal_tokens').doc('XkE7Kq5jNdfY0gW26eE1ZcIihm12').get();
  if (!ts.exists) {
    console.log("No token");
    return;
  }
  const tokenDoc = ts.data();
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokenDoc);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  try {
    const ev = await calendar.events.get({ calendarId: 'primary', eventId: '4avqi1oo38ifhbtvtcnd6m49qo' });
    console.log('GCAL EVENT START:', ev.data.start);
    console.log('GCAL EVENT END:', ev.data.end);
    console.log('GCAL EVENT ID:', ev.data.id);
    console.log('GCAL EVENT SUMMARY:', ev.data.summary);
  } catch (e) {
    console.log('Error fetching from GCal:', e.message);
  }
}
run();
