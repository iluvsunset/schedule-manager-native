const admin = require('firebase-admin');
const { sendEmail } = require('./_utils');
// --- SHARED INIT LOGIC ---
function getServiceAccount() {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIREBASE_SERVICE_ACCOUNT.includes('"private_key": "..."')) {
      const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');
      return creds;
    }
    const fs = require('fs');
    const path = require('path');
    const localPath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(localPath)) return require(localPath);
    return null;
  } catch (e) { return null; }
}

if (!admin.apps.length) {
  try {
    const sa = getServiceAccount();
    if (sa) admin.initializeApp({ credential: admin.credential.cert(sa) });
  } catch (e) { }
}

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // 1. Security Check (CRON_SECRET)
  let isAuthorized = false;
  let manualTriggerUser = null;
  
  if (req.body && req.body.idToken) {
    try {
      const decoded = await admin.auth().verifyIdToken(req.body.idToken);
      const userSnap = await admin.firestore().collection('allowed_users').doc(decoded.email.toLowerCase()).get();
      if (userSnap.exists && userSnap.data().role === 'it') {
        isAuthorized = true;
        manualTriggerUser = decoded.email;
      }
    } catch (e) {
      console.error('Manual cron auth failed:', e);
    }
  }

  const authHeader = req.headers.authorization;
  if (!isAuthorized && req.headers['x-vercel-cron'] !== '1' && (!authHeader || !authHeader.startsWith('Bearer ' + process.env.CRON_SECRET))) {
    if (!process.env.CRON_SECRET) {
      console.warn("Warning: CRON_SECRET not set. Skipping auth check (Dangerous in Prod).");
    } else {
      return res.status(401).json({ error: 'Unauthorized Cron Request' });
    }
  }

  try {
    const db = admin.firestore();
    try { db.settings({ preferRest: true }); } catch (e) { }

    // 2. Determine "Tomorrow" (day before the event date)
    const now = new Date();
    const startOfTomorrow = new Date(now);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    startOfTomorrow.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(now);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    endOfTomorrow.setHours(23, 59, 59, 999);

    // Firestore Timestamps
    const startTs = admin.firestore.Timestamp.fromDate(startOfTomorrow);
    const endTs = admin.firestore.Timestamp.fromDate(endOfTomorrow);

    console.log(`Cron: Scanning for tomorrow's schedules between ${startOfTomorrow.toISOString()} and ${endOfTomorrow.toISOString()}`);

    // 3. Query Schedules happening TOMORROW only
    const snapshot = await db.collection('schedules')
      .where('date', '>=', startTs)
      .where('date', '<=', endTs)
      .get();

    if (snapshot.empty) {
      console.log('No schedules found for tomorrow.');
      return res.status(200).json({ message: 'No schedules found for tomorrow.' });
    }

    console.log(`Found ${snapshot.size} schedule(s) for tomorrow.`);

    // 4. (Removed Mailjet API keys logic)
    
    let emailsSent = 0;
    const emailPromises = [];

    // 5. Process each schedule
    for (const doc of snapshot.docs) {
      const schedule = doc.data();
      let participants = schedule.participants || [];

      // Resolve participants from class if schedule has a classId (source of truth)
      if (schedule.classId) {
        try {
          const classDoc = await db.collection('classes').doc(schedule.classId).get();
          if (classDoc.exists) {
            const classParticipants = classDoc.data().participants || [];
            if (classParticipants.length > 0) {
              participants = classParticipants;
            }
          }
        } catch (e) {
          console.warn(`Could not resolve class ${schedule.classId} for schedule ${doc.id}:`, e.message);
        }
      }

      if (participants.length === 0) {
        console.log(`Schedule ${doc.id} has no participants, skipping.`);
        continue;
      }

      console.log(`Processing schedule: ${schedule.place} with ${participants.length} participant(s)`);

      for (const email of participants) {
        try {
          // Check user role - ONLY send to students
          const userSnap = await db.collection('allowed_users').doc(email.toLowerCase()).get();
          const role = userSnap.exists ? userSnap.data().role : 'student';

          if (role !== 'student') {
            console.log(`Skipping ${email} - role is ${role}, not student`);
            continue;
          }

          // Use user's saved timezone, fallback to Vietnam (UTC+7)
          const userTimezone = (userSnap.exists && userSnap.data().timezone) 
            ? userSnap.data().timezone 
            : 'Asia/Ho_Chi_Minh';

          // All reminders are for tomorrow (day-before notification)
          const dayString = 'tomorrow';
          const dayLabel = 'Tomorrow';

          const scheduleDateObj = schedule.date.toDate();

          // Format time in user's local timezone
          const scheduleTime = scheduleDateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: userTimezone,
            hour12: false
          });

          // Get timezone abbreviation/offset for display
          const tzLabel = scheduleDateObj.toLocaleTimeString('en-US', {
            timeZone: userTimezone,
            timeZoneName: 'short'
          }).split(' ').slice(-1)[0] || userTimezone.split('/').pop().replace('_', ' ');

          const html = `
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
                        .title {
                          font-family: 'Fredoka', sans-serif;
                          font-size: 26px;
                          font-weight: 700;
                          color: #2B2B2B;
                          margin: 0 0 20px;
                        }
                        .divider {
                          border: none;
                          border-bottom: 2px dashed #E2E8F0;
                          margin: 24px 0;
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
                          width: 80px;
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
                          background-color: #FFC01E;
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
                          <div class="super-title">Class Reminder</div>
                          <h1 class="title">${schedule.place}</h1>
                          
                          <div class="divider"></div>
                          
                          <p class="text">Just a heads up! You have a class starting ${dayString}. Please check the details below:</p>
                          
                          <div class="info-box">
                            <div class="info-row">
                              <span class="label">Time</span>
                              <span class="value">${scheduleTime} <span style="font-size: 12px; color: #718096;">(${tzLabel})</span></span>
                            </div>
                            <div class="info-row">
                              <span class="label">Date</span>
                              <span class="value">${dayLabel}</span>
                            </div>
                          </div>

                          <div style="margin-top: 32px;">
                            <a href="https://schedule-iluvsunset.vercel.app/" class="btn">Open Chronos</a>
                          </div>
                        </div>
                        <div class="footer">
                          <p>&copy; 2026 Chronos School Manager</p>
                        </div>
                      </div>
                    </body>
                    </html>
                `;

          // Queue the email
          const subject = `Reminder: ${schedule.place} is ${dayString}`;
          const emailPromise = sendEmail(db, email, subject, html)
            .then(() => {
              console.log(`Email queued for ${email}`);
              return { success: true, email };
            }).catch(err => {
              console.error(`Failed to send to ${email}:`, err.message);
              return { success: false, email, error: err.message };
            });

          emailPromises.push(emailPromise);
          emailsSent++;

        } catch (error) {
          console.error(`Error processing ${email}:`, error.message);
        }
      }
    }

    // 6. Wait for all emails and collect results
    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    console.log(`Cron completed: ${successful} successful, ${failed} failed out of ${emailsSent} total attempts`);

    // 7. Webhook Channel Renewal — prevent silent death of GCal push notifications
    let channelsRenewed = 0;
    let channelErrors = 0;
    try {
      const { google } = require('googleapis');
      const crypto = require('crypto');

      const tokenSnap = await db.collection('gcal_tokens').get();
      const now48h = Date.now() + (48 * 60 * 60 * 1000); // 48 hours from now

      for (const tokenDoc of tokenSnap.docs) {
        const tokenData = tokenDoc.data();
        const expiration = parseInt(tokenData.webhookExpiration || '0');

        // Skip if no webhook or not expiring soon
        if (!tokenData.refresh_token || !expiration || expiration > now48h) continue;

        try {
          const { getOAuthClient } = require('./_utils');
          const oauth2Client = getOAuthClient();
          oauth2Client.setCredentials({
            refresh_token: tokenData.refresh_token,
            access_token: tokenData.access_token
          });

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          // Stop old channel
          if (tokenData.webhookChannelId && tokenData.webhookResourceId) {
            try {
              await calendar.channels.stop({
                requestBody: {
                  id: tokenData.webhookChannelId,
                  resourceId: tokenData.webhookResourceId
                }
              });
            } catch (stopErr) {
              console.warn(`Could not stop old channel for ${tokenDoc.id}:`, stopErr.message);
            }
          }

          // Register new channel
          const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/gcal-webhook`
            : 'https://schedule-iluvsunset.vercel.app/api/gcal-webhook';

          const channelId = crypto.randomUUID();
          const watchRes = await calendar.events.watch({
            calendarId: 'primary',
            requestBody: {
              id: channelId,
              type: 'web_hook',
              address: webhookUrl,
              token: tokenDoc.id
            }
          });

          await tokenDoc.ref.update({
            webhookChannelId: watchRes.data.id,
            webhookResourceId: watchRes.data.resourceId,
            webhookExpiration: watchRes.data.expiration,
          });

          channelsRenewed++;
          console.log(`Renewed webhook channel for UID: ${tokenDoc.id}`);
          
          try {
            await db.collection('system_logs').add({
              type: 'channel_renewal',
              uid: tokenDoc.id,
              channelId: watchRes.data.id,
              expiration: watchRes.data.expiration,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
          } catch (logErr) {
            console.error('Failed to write channel_renewal log:', logErr.message);
          }
        } catch (renewErr) {
          channelErrors++;
          console.error(`Failed to renew channel for ${tokenDoc.id}:`, renewErr.message);
        }
      }
    } catch (renewalErr) {
      console.error('Webhook renewal phase error:', renewalErr.message);
    }

    // 8. Write system log for IT visibility
    try {
      await db.collection('system_logs').add({
        type: 'cron',
        source: 'email',
        message: `Daily cron: ${successful} emails sent, ${failed} failed. ${channelsRenewed} webhook channels renewed.`,
        details: {
          schedules_processed: snapshot.size,
          emails_attempted: emailsSent,
          emails_successful: successful,
          emails_failed: failed,
          channels_renewed: channelsRenewed,
          channel_errors: channelErrors
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (logErr) {
      console.error('Failed to write cron log:', logErr.message);
    }

    return res.status(200).json({
      success: true,
      emails_attempted: emailsSent,
      emails_successful: successful,
      emails_failed: failed,
      schedules_processed: snapshot.size,
      channels_renewed: channelsRenewed
    });

  } catch (error) {
    console.error("Cron Error:", error);
    return res.status(500).json({ error: error.message });
  }
};