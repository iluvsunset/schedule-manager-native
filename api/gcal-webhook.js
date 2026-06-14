// @ts-nocheck
const { admin, getOAuthClient, sendEmail } = require('./_utils');
const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  // Webhooks must always return 200 quickly so Google doesn't retry
  res.status(200).send('Webhook received');

  try {
    const resourceState = req.headers['x-goog-resource-state'];
    if (resourceState === 'sync') {
      console.log('Received initial Google Calendar sync webhook. Ignoring.');
      return;
    }

    const uid = req.headers['x-goog-channel-token'];
    if (!uid) {
      console.error('Webhook missing x-goog-channel-token');
      return;
    }

    console.log(`Processing GCal Webhook for UID: ${uid}`);

    const db = admin.firestore();
    try { db.settings({ preferRest: true }); } catch (e) { }

    // 1. Fetch User's Google Token
    const tokenSnap = await db.collection('gcal_tokens').doc(uid).get();
    if (!tokenSnap.exists) {
      console.error(`No tokens found for UID ${uid}`);
      return;
    }

    const { refresh_token, access_token } = tokenSnap.data();
    if (!refresh_token) {
      console.error(`No refresh token for UID ${uid}`);
      return;
    }

    // 2. Auth with Google
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
      refresh_token,
      access_token // Setting access_token is optional if refresh_token is present, it will auto-refresh
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 3. Fetch recently updated events (last 10 minutes to be safe)
    const updatedMin = new Date();
    updatedMin.setMinutes(updatedMin.getMinutes() - 10);

    const eventsRes = await calendar.events.list({
      calendarId: 'primary',
      updatedMin: updatedMin.toISOString(),
      singleEvents: true,
      maxResults: 50,
    });

    const fetchedEvents = eventsRes.data.items || [];
    if (fetchedEvents.length === 0) {
      console.log('No recently updated events found.');
      return;
    }

    // 4. Fetch the user's email to associate as the creator
    const userSnap = await admin.auth().getUser(uid).catch(() => null);
    const userEmail = userSnap ? userSnap.email.toLowerCase() : '';

    // 5. Compile Auto-Share Rules from ALL classes
    const classesSnap = await db.collection('classes').get();
    const rules = [];
    classesSnap.forEach(doc => {
      const c = doc.data();
      if (c.gcalAutoShares && Array.isArray(c.gcalAutoShares)) {
        c.gcalAutoShares.forEach(eventName => {
          rules.push({
            eventName: eventName,
            classId: doc.id,
            className: c.className,
            participants: c.participants || []
          });
        });
      }
    });

    if (rules.length === 0) {
      console.log('No auto-share rules configured in any class.');
      return;
    }

      let autoSharedCount = 0;
      let personalSyncCount = 0;
      let updatedCount = 0;
      let deletedCount = 0;
      for (const event of fetchedEvents) {
        
        // Direct DB check to find existing synced events
        const dupSnap = await db.collection('schedules')
                                .where('gcalEventId', '==', event.id)
                                .get();

        if (event.status === 'cancelled') {
          // Handle deletions
          if (!dupSnap.empty) {
            for (const doc of dupSnap.docs) {
              await doc.ref.delete();
              deletedCount++;
            }
            console.log(`Deleted cancelled GCal event ID: ${event.id}`);
          }
          continue; 
        }
        
        const summary = (event.summary || '').trim();
        if (!summary) continue;
  
        const rule = rules.find(r => r.eventName.trim().toLowerCase() === summary.toLowerCase());
        const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date);
  
        if (!dupSnap.empty) {
          // UPDATE existing event
          const existingDoc = dupSnap.docs[0];
          await existingDoc.ref.update({
            date: admin.firestore.Timestamp.fromDate(start),
            place: summary || 'Google Calendar Event',
            location: event.location || event.hangoutLink || event.htmlLink || '',
            notes: event.description || 'Automatically synced from Google Calendar',
          });
          console.log(`Updated existing GCal event: ${summary}`);
          updatedCount++;
          continue;
        }
  
        if (!rule) {
          continue; // Do not sync personal events that don't match a class rule!
        }
  
        const scheduleData = {
          userId: uid,
          userEmail: userEmail,
          classId: rule.classId,
          className: rule.className,
          date: admin.firestore.Timestamp.fromDate(start),
          place: summary || 'Google Calendar Event',
          location: event.location || event.hangoutLink || event.htmlLink || '',
          notes: event.description || 'Automatically synced from Google Calendar',
          participants: rule.participants,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'upcoming',
          source: 'google_calendar',
          gcalEventId: event.id
        };
  
        await db.collection('schedules').add(scheduleData);
        
        console.log(`Auto-shared GCal event: ${summary} to class ${rule.className}`);
        autoSharedCount++;

          // 7. Send email notifications to students
          const studentEmails = [];
          for (const email of rule.participants) {
            const uSnap = await db.collection('allowed_users').doc(email.toLowerCase()).get();
            if (uSnap.exists && uSnap.data().role === 'student') {
              studentEmails.push(email);
            }
          }

          if (studentEmails.length > 0) {
            const formattedDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            
            // format time helper
            const formatTime = (d) => {
              return d.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
            };
            
            const timeStr = event.start.dateTime ? formatTime(start) : 'All Day';
            
            const html = `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>New Class Event Added!</h2>
                <p><strong>${scheduleData.place}</strong> has been scheduled.</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${timeStr}</p>
                <br>
                <a href="https://schedule-iluvsunset.vercel.app/" style="padding: 10px 20px; background: #FFC01E; color: black; text-decoration: none; border-radius: 5px;">View Schedule</a>
              </div>
            `;

            for (const email of studentEmails) {
              const subject = `New Event (GCal Auto): ${scheduleData.place}`;
              sendEmail(db, email, subject, html).catch(e => console.error('Webhook Email Error:', e.message));
            }
          }
        }
    
    // Always log webhook activity to system_logs for IT visibility
    try {
      await db.collection('system_logs').add({
        type: 'webhook',
        source: 'gcal',
        uid: uid,
        userEmail: userEmail || 'unknown',
        message: autoSharedCount > 0 || updatedCount > 0 || deletedCount > 0
          ? `Synced ${autoSharedCount} new, ${updatedCount} updated, ${deletedCount} deleted events`
          : `Webhook fired — ${fetchedEvents.length} events checked, no changes needed`,
        details: {
          eventsChecked: fetchedEvents.length,
          autoShared: autoSharedCount,
          updated: updatedCount,
          deleted: deletedCount,
          rulesCount: rules.length
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (logErr) {
      console.error('Failed to write system log:', logErr.message);
    }

    if (autoSharedCount > 0 || updatedCount > 0 || deletedCount > 0) {
      console.log(`Successfully synced auto-shared ${autoSharedCount}, updated ${updatedCount}, and deleted ${deletedCount} events via webhook.`);
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
  }
};
