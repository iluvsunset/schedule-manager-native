const { getOAuthClient, admin } = require('./_utils');
const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing Token' });
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    const db = admin.firestore();

    // 1. Get GCal Tokens
    const tokenDoc = await db.collection('gcal_tokens').doc(uid).get();
    if (!tokenDoc.exists) {
      return res.status(401).json({ error: 'Google Calendar not connected' });
    }
    const tokens = tokenDoc.data();

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(tokens);

    // 2. Refresh token if expired
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await db.collection('gcal_tokens').doc(uid).set(credentials, { merge: true });
      oauth2Client.setCredentials(credentials);
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 3. Get User Profile for reminder offsets
    const userSnap = await db.collection('allowed_users').doc(email.toLowerCase()).get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const offsets = userData.emailReminderOffsets || [24]; // default 24h

    // Create GCal reminder overrides based on user offsets
    const overrides = offsets.map(offsetHours => ({
      method: 'popup',
      minutes: offsetHours * 60
    }));

    // 4. Fetch User's Schedules (Active)
    const schedulesSnap = await db.collection('schedules')
      .where('participants', 'array-contains', email.toLowerCase())
      .where('status', 'in', ['upcoming', 'completed'])
      .get();

    let syncedCount = 0;
    const errors = [];
    const action = req.body?.action || 'sync';

    // 5. Sync or Remove from Google Calendar
    for (const docSnap of schedulesSnap.docs) {
      const schedule = docSnap.data();
      
      const startTime = schedule.date && typeof schedule.date.toDate === 'function' ? schedule.date.toDate() : new Date(schedule.date || Date.now());
      let endTime;
      if (schedule.endDate) {
        endTime = typeof schedule.endDate.toDate === 'function' ? schedule.endDate.toDate() : new Date(schedule.endDate);
      } else {
        endTime = new Date(startTime.getTime() + (schedule.duration || 60) * 60000);
      }

      const existingEventId = schedule.exportedGcalEventId || (schedule.gcalEventIds && schedule.gcalEventIds[email.toLowerCase()]);

      if (action === 'remove') {
        if (existingEventId) {
          try {
            await calendar.events.delete({
              calendarId: 'primary',
              eventId: existingEventId
            });
            await docSnap.ref.update({ 
              exportedGcalEventId: admin.firestore.FieldValue.delete(),
              [`gcalEventIds.${email.toLowerCase()}`]: admin.firestore.FieldValue.delete()
            });
            syncedCount++;
          } catch (err) {
            // Ignore if already deleted in GCal
            if (err.code === 404 || err.code === 410) {
              await docSnap.ref.update({ 
                exportedGcalEventId: admin.firestore.FieldValue.delete(),
                [`gcalEventIds.${email.toLowerCase()}`]: admin.firestore.FieldValue.delete()
              });
              syncedCount++;
            } else {
              errors.push(err.message);
            }
          }
        }
        continue;
      }

      // Build rich description from all DB info
      const descParts = [];
      if (schedule.className) descParts.push(`📚 Class: ${schedule.className}`);
      if (schedule.notes && schedule.notes !== 'None') descParts.push(`📝 Notes: ${schedule.notes}`);
      if (schedule.assignmentTask) descParts.push(`📋 Assignment: ${schedule.assignmentTask}`);
      if (schedule.assignmentDue) descParts.push(`⏰ Due: ${schedule.assignmentDue}`);
      if (schedule.assignmentLink) descParts.push(`🔗 Link: ${schedule.assignmentLink}`);
      if (schedule.reviewLearned) descParts.push(`💡 Learned: ${schedule.reviewLearned}`);
      if (schedule.reviewNotes) descParts.push(`📖 Review: ${schedule.reviewNotes}`);
      descParts.push('\nManaged by Schedule Manager.');

      const eventPayload = {
        summary: `Class: ${schedule.place || schedule.classId}`,
        description: descParts.join('\n'),
        location: schedule.location || '',
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
        reminders: {
          useDefault: false,
          overrides: overrides
        }
      };

      try {
        if (existingEventId) {
          // Update existing
          await calendar.events.update({
            calendarId: 'primary',
            eventId: existingEventId,
            requestBody: eventPayload,
          });
          // Sync ID back to exportedGcalEventId for consistency
          if (!schedule.exportedGcalEventId) {
            await docSnap.ref.update({ exportedGcalEventId: existingEventId });
          }
        } else {
          // Insert new
          const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: eventPayload,
          });
          // Save the exported ID back to firestore so we can update it later
          await docSnap.ref.update({ exportedGcalEventId: res.data.id });
        }
        syncedCount++;
      } catch (err) {
        console.error(`Error syncing schedule ${docSnap.id}:`, err.message);
        errors.push(err.message);
      }
    }

    return res.status(200).json({ success: true, syncedCount, errors });

  } catch (error) {
    console.error('Error in export-gcal:', error);
    return res.status(500).json({ error: error.message });
  }
};
