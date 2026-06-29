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
    // Auth: IT only
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing Token' });
    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const db = admin.firestore();

    const userSnap = await db.collection('allowed_users').doc(decoded.email.toLowerCase()).get();
    if (!userSnap.exists || userSnap.data().role !== 'it') {
      return res.status(403).json({ error: 'IT admin only' });
    }

    // 1. Find all schedules that have some GCal ID but no endDate
    const allSchedules = await db.collection('schedules').get();
    const needsBackfill = [];
    allSchedules.forEach(doc => {
      const d = doc.data();
      const hasId = d.gcalEventId || d.exportedGcalEventId || (d.gcalEventIds && Object.keys(d.gcalEventIds).length > 0);
      if (hasId && !d.endDate) {
        needsBackfill.push({ id: doc.id, ...d });
      }
    });

    if (needsBackfill.length === 0) {
      return res.status(200).json({ success: true, message: 'All events already have endDate!', updated: 0, skipped: 0 });
    }

    // 2. Group by userId so we only auth once per user
    const byUser = {};
    for (const sched of needsBackfill) {
      const uid = sched.userId;
      if (!uid) continue;
      if (!byUser[uid]) byUser[uid] = [];
      byUser[uid].push(sched);
    }

    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const [uid, schedules] of Object.entries(byUser)) {
      try {
        // Get user's stored OAuth tokens
        const tokenDoc = await db.collection('gcal_tokens').doc(uid).get();
        if (!tokenDoc.exists) {
          skipped += schedules.length;
          continue;
        }

        const tokens = tokenDoc.data();
        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials(tokens);

        // Refresh if expired
        if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
          const { credentials } = await oauth2Client.refreshAccessToken();
          await db.collection('gcal_tokens').doc(uid).set(credentials, { merge: true });
          oauth2Client.setCredentials(credentials);
        }

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 3. For each schedule, fetch the GCal event to get end time
        for (const sched of schedules) {
          try {
            // Priority: webhook > export > background sync (pick the owner's event)
            let eventIdToFetch = sched.gcalEventId || sched.exportedGcalEventId;
            if (!eventIdToFetch && sched.gcalEventIds) {
              const uSnap = await db.collection('allowed_users').where('uid', '==', uid).get();
              const uEmail = !uSnap.empty ? uSnap.docs[0].id : null;
              eventIdToFetch = uEmail ? sched.gcalEventIds[uEmail] : Object.values(sched.gcalEventIds)[0];
            }

            if (!eventIdToFetch) {
              skipped++;
              continue;
            }

            const gcalEvent = await calendar.events.get({
              calendarId: 'primary',
              eventId: eventIdToFetch,
            });

            const event = gcalEvent.data;
            if (event.end) {
              const endDate = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date);
              
              const updateData = { endDate: admin.firestore.Timestamp.fromDate(endDate) };

              // Also backfill location if missing
              if (!sched.location && event.location) {
                updateData.location = event.location;
                updateData.gcalLocation = event.location;
              }

              await db.collection('schedules').doc(sched.id).update(updateData);
              updated++;
            } else {
              skipped++;
            }
          } catch (err) {
            // Event might have been deleted from GCal
            if (err.code === 404) {
              skipped++;
            } else {
              errors.push({ scheduleId: sched.id, error: err.message });
              skipped++;
            }
          }
        }
      } catch (err) {
        errors.push({ userId: uid, error: err.message });
        skipped += schedules.length;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Backfill complete! Updated ${updated} events.`,
      total: needsBackfill.length,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in backfill-enddate:', error);
    return res.status(500).json({ error: error.message });
  }
};
