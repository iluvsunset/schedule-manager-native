// @ts-nocheck
const { admin, getOAuthClient, sendEmail } = require('./_utils');
const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-goog-channel-token, x-goog-resource-state, x-goog-resource-id');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = admin.firestore();
    try { db.settings({ preferRest: true }); } catch (e) { }

    let uidList = [];
    let isManualSync = false;

    if (req.body && req.body.idToken) {
      // Manual Trigger Flow
      isManualSync = true;
      const decoded = await admin.auth().verifyIdToken(req.body.idToken);
      const userSnap = await db.collection('allowed_users').doc(decoded.email.toLowerCase()).get();
      if (!userSnap.exists || userSnap.data().role !== 'it') {
        return res.status(403).json({ error: 'Unauthorized admin' });
      }
      const allTokens = await db.collection('gcal_tokens').get();
      allTokens.forEach(doc => uidList.push(doc.id));
      console.log(`Manual GCal Sync triggered by IT: ${decoded.email} for ${uidList.length} users`);
    } else {
      // Normal Webhook Flow
      const resourceState = req.headers['x-goog-resource-state'];
      if (resourceState === 'sync') {
        console.log('Received initial Google Calendar sync webhook. Ignoring.');
        return res.status(200).send('Sync webhook received');
      }

      const uid = req.headers['x-goog-channel-token'];
      if (!uid) {
        console.error('Webhook missing x-goog-channel-token');
        return res.status(400).send('Missing x-goog-channel-token');
      }
      uidList.push(uid);
    }

    async function processUid(uid) {
      console.log(`Processing GCal Sync for UID: ${uid}`);
      const emailPromises = [];



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

    // 3. Fetch recently modified events
    const updatedMin = new Date();
    if (isManualSync) {
      updatedMin.setHours(updatedMin.getHours() - 24); // Look back 24 hours for manual syncs to catch missed updates
    } else {
      updatedMin.setMinutes(updatedMin.getMinutes() - 10); // Look back 10 mins for webhook triggers
    }

    const eventsRes = await calendar.events.list({
      calendarId: 'primary',
      updatedMin: updatedMin.toISOString(),
      singleEvents: true,
      maxResults: 50,
      showDeleted: true,
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
            const data = dupSnap.docs[0].data();
            for (const doc of dupSnap.docs) {
              await doc.ref.delete();
              deletedCount++;
            }
            console.log(`Deleted cancelled GCal event ID: ${event.id}`);

            // Send cancellation emails to students
            let participants = data.participants;
            if (!participants || !Array.isArray(participants)) {
              if (data.classId) {
                const classSnap = await db.collection('classes').doc(data.classId).get();
                if (classSnap.exists) {
                  participants = classSnap.data().participants || [];
                }
              }
            }

            if (participants && Array.isArray(participants)) {
              const studentEmails = [];
              for (const email of participants) {
                const uSnap = await db.collection('allowed_users').doc(email.toLowerCase()).get();
                if (uSnap.exists && uSnap.data().role === 'student') {
                  studentEmails.push(email);
                }
              }
              if (studentEmails.length > 0) {
                const html = `
                  <div style="font-family: sans-serif; padding: 20px;">
                    <h2 style="color: #EF4444;">Class Event Cancelled!</h2>
                    <p><strong>${data.place || 'An event'}</strong> has been cancelled.</p>
                    <br>
                    <a href="https://schedule-iluvsunset.vercel.app/" style="padding: 10px 20px; background: #EF4444; color: white; text-decoration: none; border-radius: 5px;">View Schedule</a>
                  </div>
                `;
                for (const email of studentEmails) {
                  const subject = `Cancelled Event (GCal Auto): ${data.place || 'Class Event'}`;
                  emailPromises.push(
                    sendEmail(db, email, subject, html)
                      .then(() => console.log(`[Email] Sent cancellation notice to ${email}`))
                      .catch(e => console.error('Webhook Deletion Email Error:', e.message))
                  );
                }
              }
            }
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
          const data = existingDoc.data();
          const oldStart = data.date ? data.date.toDate() : null;
          const hasTimeChanged = oldStart ? (oldStart.getTime() !== start.getTime()) : false;

          await existingDoc.ref.update({
            date: admin.firestore.Timestamp.fromDate(start),
            place: summary || 'Google Calendar Event',
            location: event.location || event.hangoutLink || event.htmlLink || '',
            notes: event.description || 'Automatically synced from Google Calendar',
          });
          console.log(`Updated existing GCal event: ${summary}`);
          updatedCount++;

          // Send update emails to students if time/date changed
          let participants = data.participants;
          if (!participants || !Array.isArray(participants)) {
            if (data.classId) {
              const classSnap = await db.collection('classes').doc(data.classId).get();
              if (classSnap.exists) {
                participants = classSnap.data().participants || [];
              }
            }
          }

          if (hasTimeChanged && participants && Array.isArray(participants)) {
            const studentEmails = [];
            for (const email of participants) {
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
              const oldTimeStr = oldStart ? (oldStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + (event.start.dateTime ? formatTime(oldStart) : 'All Day')) : 'N/A';

              const html = `
                <div style="font-family: sans-serif; padding: 20px;">
                  <h2 style="color: #3B82F6;">Class Event Rescheduled!</h2>
                  <p><strong>${summary}</strong> has been rescheduled.</p>
                  <p><strong>Previous Time:</strong> <span style="text-decoration: line-through; color: #EF4444;">${oldTimeStr}</span></p>
                  <p><strong>New Time:</strong> <span style="color: #10B981; font-weight: bold;">${formattedDate} at ${timeStr}</span></p>
                  <br>
                  <a href="https://schedule-iluvsunset.vercel.app/" style="padding: 10px 20px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px;">View Schedule</a>
                </div>
              `;
              for (const email of studentEmails) {
                const subject = `Rescheduled Event (GCal Auto): ${summary}`;
                emailPromises.push(
                  sendEmail(db, email, subject, html)
                    .then(() => console.log(`[Email] Sent reschedule notice to ${email}`))
                    .catch(e => console.error('Webhook Update Email Error:', e.message))
                );
              }
            }
          }

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
  
        await db.collection('schedules').doc('gcal_' + event.id).set(scheduleData);
        
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
              emailPromises.push(
                sendEmail(db, email, subject, html)
                  .then(() => console.log(`[Email] Sent creation notice to ${email}`))
                  .catch(e => console.error('Webhook Email Error:', e.message))
              );
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

    if (emailPromises.length > 0) {
      console.log(`Awaiting ${emailPromises.length} email deliveries...`);
      await Promise.all(emailPromises);
    }
 
    if (autoSharedCount > 0 || updatedCount > 0 || deletedCount > 0) {
      console.log(`Successfully synced auto-shared ${autoSharedCount}, updated ${updatedCount}, and deleted ${deletedCount} events via webhook.`);
    }

    }
    
    // Execute for all UIDs
    for (const u of uidList) {
      await processUid(u);
    }

    if (isManualSync) {
      return res.status(200).json({ success: true, processedUids: uidList.length });
    } else {
      return res.status(200).send('Webhook received');
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: error.message });
  }
};
