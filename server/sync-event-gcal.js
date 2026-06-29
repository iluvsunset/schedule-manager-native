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
    const { schedule, scheduleId, action = 'sync', skipEmails = [] } = req.body;
    if (!schedule || !scheduleId) {
      return res.status(400).json({ error: 'Missing schedule or scheduleId' });
    }

    const db = admin.firestore();
    const participants = schedule.participants || [];
    if (participants.length === 0) {
      return res.status(200).json({ success: true, message: 'No participants to sync' });
    }

    let syncedCount = 0;
    const errors = [];
    let updatedGcalIds = schedule.gcalEventIds || {};
    const legacyExportedId = schedule.exportedGcalEventId;

    for (const email of participants) {
      const emailLower = email.toLowerCase();
      if (skipEmails.includes(emailLower)) continue;

      try {
        const usersSnap = await admin.auth().getUserByEmail(emailLower).catch(() => null);
        if (!usersSnap) continue;

        const uid = usersSnap.uid;
        const tokenDoc = await db.collection('gcal_tokens').doc(uid).get();
        if (!tokenDoc.exists) continue;
        
        const tokens = tokenDoc.data();
        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials(tokens);

        if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
          const { credentials } = await oauth2Client.refreshAccessToken();
          await db.collection('gcal_tokens').doc(uid).set(credentials, { merge: true });
          oauth2Client.setCredentials(credentials);
        }

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const userGcalEventId = updatedGcalIds[emailLower] || legacyExportedId;

        if (action === 'delete') {
          if (userGcalEventId) {
            await calendar.events.delete({
              calendarId: 'primary',
              eventId: userGcalEventId,
            }).catch(err => console.log('GCal Delete Error:', err.message));
          }
          continue;
        }

        const userSnap = await db.collection('allowed_users').doc(emailLower).get();
        const userData = userSnap.exists ? userSnap.data() : {};
        const offsets = userData.emailReminderOffsets || [24];

        const overrides = offsets.map(offsetHours => ({
          method: 'popup',
          minutes: offsetHours * 60
        }));

        let startTime;
        if (schedule.date && schedule.date.seconds) {
          startTime = new Date(schedule.date.seconds * 1000);
        } else {
          startTime = new Date(schedule.date || Date.now());
        }
        let endTime;
        if (schedule.endDate) {
          endTime = schedule.endDate.seconds ? new Date(schedule.endDate.seconds * 1000) : new Date(schedule.endDate);
        } else {
          endTime = new Date(startTime.getTime() + (schedule.duration || 60) * 60000);
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
          start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
          end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
          reminders: { useDefault: false, overrides: overrides }
        };

        if (userGcalEventId) {
          await calendar.events.update({
            calendarId: 'primary',
            eventId: userGcalEventId,
            requestBody: eventPayload,
          }).catch(async (err) => {
            if (err.code === 404) {
              const res = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: eventPayload,
              });
              updatedGcalIds[emailLower] = res.data.id;
            } else {
              throw err;
            }
          });
        } else {
          const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: eventPayload,
          });
          updatedGcalIds[emailLower] = res.data.id;
        }
        syncedCount++;

      } catch (err) {
        console.error(`Error syncing for ${emailLower}:`, err.message);
        errors.push({ email: emailLower, error: err.message });
      }
    }

    if (action !== 'delete') {
      await db.collection('schedules').doc(scheduleId).update({ gcalEventIds: updatedGcalIds });
    }

    return res.status(200).json({ success: true, syncedCount, errors });

  } catch (error) {
    console.error('Error in sync-event-gcal:', error);
    return res.status(500).json({ error: error.message });
  }
};
