// @ts-nocheck
const { admin, getOAuthClient, sendEmail } = require('./_utils');
const { google } = require('googleapis');

function getWebhookEmailTemplate({ title, superTitle, body, btnText, btnColor, btnLink }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Outfit', -apple-system, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #FDFBF7;
          color: #2B2B2B;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .binder-rings {
          display: flex;
          justify-content: space-around;
          padding: 0 40px;
          margin-bottom: -10px;
          position: relative;
          z-index: 10;
        }
        .binder-rings span {
          width: 12px;
          height: 24px;
          background: #E2E8F0;
          border: 2px solid #2B2B2B;
          border-radius: 6px;
        }
        .card {
          background-color: #FFFFFF;
          border-radius: 20px;
          padding: 40px;
          border: 2px solid #2B2B2B;
          box-shadow: 6px 6px 0px #2B2B2B;
          text-align: center;
          position: relative;
        }
        .super-title {
          font-family: 'Fredoka', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin: 0 0 8px;
        }
        .class-title {
          font-family: 'Fredoka', sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: #2B2B2B;
          margin: 0 0 20px;
          line-height: 1.3;
        }
        .text {
          font-size: 16px;
          line-height: 1.6;
          color: #4A5568;
          margin-bottom: 24px;
        }
        .info-box {
          background-color: #FAF8F5;
          border: 2px solid #2B2B2B;
          border-radius: 16px;
          box-shadow: 3px 3px 0px #2B2B2B;
          padding: 24px;
          margin-bottom: 28px;
          text-align: left;
        }
        .info-row {
          display: flex;
          margin-bottom: 12px;
          align-items: center;
        }
        .info-row:last-child {
          margin-bottom: 0;
        }
        .label {
          width: 90px;
          color: #718096;
          font-family: 'Fredoka', sans-serif;
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 700;
        }
        .value {
          color: #2B2B2B;
          font-weight: 600;
          font-size: 15px;
        }
        .btn {
          display: inline-block;
          background-color: ${btnColor || '#FFC01E'};
          color: #2B2B2B !important;
          padding: 14px 36px;
          border-radius: 12px;
          text-decoration: none;
          font-family: 'Fredoka', sans-serif;
          font-weight: 700;
          font-size: 16px;
          border: 2px solid #2B2B2B;
          box-shadow: 4px 4px 0px #2B2B2B;
          transition: all 0.1s ease;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          font-size: 12px;
          color: #A0AEC0;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="binder-rings">
          <span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="card">
          <div class="super-title">${superTitle}</div>
          <h2 class="class-title">${title}</h2>
          
          <div style="text-align: left;">
            ${body}
          </div>

          <div style="margin-top: 32px; text-align: center;">
            <a href="${btnLink}" class="btn">${btnText}</a>
          </div>
        </div>
        
        <div class="footer">
          <p>&copy; 2026 Chronos School Manager</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

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
                const html = getWebhookEmailTemplate({
                  superTitle: "SCHEDULE UPDATE",
                  title: "Class Event Cancelled!",
                  body: `
                    <p class="text"><strong>${data.place || 'An event'}</strong> has been cancelled.</p>
                  `,
                  btnText: "View Schedule",
                  btnColor: "#EF4444",
                  btnLink: "https://schedule-iluvsunset.vercel.app/"
                });
                for (const email of studentEmails) {
                  const subject = `Cancelled Event: ${data.place || 'Class Event'}`;
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

          const updateData = {
            date: admin.firestore.Timestamp.fromDate(start),
            notes: event.description || data.notes || 'Automatically synced from Google Calendar',
          };

          // 1. Only update place name if summary changed from originally synced summary
          const oldOriginalSummary = data.originalSummary || data.place || '';
          if (summary && summary !== oldOriginalSummary) {
            updateData.place = summary;
            updateData.originalSummary = summary;
          }

          // 2. Only update location if event location changed from last synced location
          const newGcalLocation = event.location || event.hangoutLink || event.htmlLink || '';
          const oldGcalLocation = data.gcalLocation !== undefined ? data.gcalLocation : (data.location || '');
          if (newGcalLocation !== oldGcalLocation) {
            updateData.location = newGcalLocation;
            updateData.gcalLocation = newGcalLocation;
            
            // Clear metadata cache so it can be re-resolved
            updateData.placeImage = null;
            updateData.placeSummary = null;
            updateData.placeRating = null;
            updateData.placeCategory = null;
            updateData.placeWebsite = null;
            updateData.placePhone = null;
          }

          await existingDoc.ref.update(updateData);
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
              const tz = event.start.timeZone || eventsRes.data.timeZone || 'Asia/Ho_Chi_Minh';
              const formattedDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz });
              
              // format time helper
              const formatTime = (d) => {
                return d.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: tz
                });
              };
              
              const timeStr = event.start.dateTime ? formatTime(start) : 'All Day';
              const oldTimeStr = oldStart ? (oldStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz }) + ' ' + (event.start.dateTime ? formatTime(oldStart) : 'All Day')) : 'N/A';

              const html = getWebhookEmailTemplate({
                superTitle: "SCHEDULE UPDATE",
                title: "Class Event Rescheduled!",
                body: `
                  <p class="text"><strong>${summary}</strong> has been rescheduled.</p>
                  <div class="info-box">
                    <div class="info-row">
                      <span class="label">Prev Time</span>
                      <span class="value" style="text-decoration: line-through; color: #EF4444;">${oldTimeStr}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">New Time</span>
                      <span class="value" style="color: #10B981; font-weight: bold;">${formattedDate} at ${timeStr}</span>
                    </div>
                  </div>
                `,
                btnText: "View Schedule",
                btnColor: "#3B82F6",
                btnLink: "https://schedule-iluvsunset.vercel.app/"
              });
              for (const email of studentEmails) {
                const subject = `Rescheduled Event: ${summary}`;
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
          originalSummary: summary || 'Google Calendar Event',
          gcalLocation: event.location || event.hangoutLink || event.htmlLink || '',
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
            const tz = event.start.timeZone || eventsRes.data.timeZone || 'Asia/Ho_Chi_Minh';
            const formattedDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz });
            
            // format time helper
            const formatTime = (d) => {
              return d.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: tz
              });
            };
            
            const timeStr = event.start.dateTime ? formatTime(start) : 'All Day';
            
            const html = getWebhookEmailTemplate({
              superTitle: "CALENDAR SYNC",
              title: "New Class Event Added!",
              body: `
                <p class="text"><strong>${scheduleData.place}</strong> has been scheduled.</p>
                <div class="info-box">
                  <div class="info-row">
                    <span class="label">Date</span>
                    <span class="value">${formattedDate}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Time</span>
                    <span class="value">${timeStr}</span>
                  </div>
                </div>
              `,
              btnText: "View Schedule",
              btnColor: "#FFC01E",
              btnLink: "https://schedule-iluvsunset.vercel.app/"
            });

            for (const email of studentEmails) {
              const subject = `New Event: ${scheduleData.place}`;
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
