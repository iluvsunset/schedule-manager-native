// @ts-nocheck
const { admin, getOAuthClient } = require('./_utils');
const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  const { uid } = req.query;

  if (!uid) {
    return res.status(400).send('Missing user ID (uid).');
  }

  try {
    const db = admin.firestore();
    const tokenSnap = await db.collection('gcal_tokens').doc(uid).get();

    if (!tokenSnap.exists || !tokenSnap.data().refresh_token) {
      return res.status(401).json({ error: 'Not connected to Google Calendar.' });
    }

    const { refresh_token, access_token } = tokenSnap.data();

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ refresh_token, access_token });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const minDate = new Date();
    minDate.setMonth(minDate.getMonth() - 2); // 2 months back for historical matching
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

    res.status(200).json({ items: eventsRes.data.items || [] });

  } catch (error) {
    console.error('Error fetching GCal events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events.' });
  }
};
