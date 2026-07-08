require('dotenv').config();
const { admin, getOAuthClient } = require('./server/_utils');
const { google } = require('googleapis');
const db = admin.firestore();

async function run() {
  // Let's look at all gcal_tokens and see if any are the teacher
  const tokensSnap = await db.collection('gcal_tokens').get();
  for (const doc of tokensSnap.docs) {
    console.log("UID:", doc.id);
    const data = doc.data();
    console.log("  Keys:", Object.keys(data).join(', '));
    
    // Try to use this token to list active watch channels
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(data);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    try {
      // There's no direct "list channels" API, but let's check if we can access their calendar
      const me = await calendar.calendarList.get({ calendarId: 'primary' });
      console.log("  Calendar access OK:", me.data.summary);
    } catch(e) {
      console.log("  Calendar error:", e.message);
    }
  }
}
run();
