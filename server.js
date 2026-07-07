const fs = require('fs');
const path = require('path');
const envLocal = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envLocal)) {
    require('dotenv').config({ path: envLocal });
}
require('dotenv').config();
const express = require('express');
const emailHandler = require('./server/email');
const { admin, sendEmail } = require('./server/_utils');
const db = admin ? admin.firestore() : null;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, '/')));

// Clean URL Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const shareHandler = require('./server/share');
const nativeGoogleAuthHandler = require('./server/native-google-auth');
const nativeGoogleCallbackHandler = require('./server/native-google-callback');
const gcalAuthHandler = require('./server/gcal-auth');
const gcalCallbackHandler = require('./server/gcal-callback');
const exportGcalHandler = require('./server/export-gcal');

// ...

app.get('/console', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Share Link Route (SSR)
app.get('/share/:id', async (req, res) => {
    req.query.id = req.params.id; // Map param to query for the handler
    try {
        await shareHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

// API Routes
app.get('/api/email', (req, res) => {
    res.status(405).json({ error: "Method Not Allowed", message: "This endpoint only accepts POST requests to send emails." });
});

app.post('/api/email', async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/email received request`);
    try {
        await emailHandler(req, res);
    } catch (error) {
        console.error("Route Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal Server Error", details: error.message });
        }
    }
});

app.post('/api/export-gcal', async (req, res) => {
    try {
        await exportGcalHandler(req, res);
    } catch (e) {
        console.error("Route Error export-gcal:", e);
        if (!res.headersSent) res.status(500).send("Server Error");
    }
});

app.get('/api/native-google-auth', async (req, res) => {
    try {
        await nativeGoogleAuthHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

app.get('/api/native-google-callback', async (req, res) => {
    try {
        await nativeGoogleCallbackHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

app.get('/api/gcal-auth', async (req, res) => {
    try {
        await gcalAuthHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

app.get('/api/gcal-callback', async (req, res) => {
    try {
        await gcalCallbackHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

const gcalEventsHandler = require('./server/gcal-events');
app.get('/api/gcal-events', async (req, res) => {
    try {
        await gcalEventsHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

const gcalWebhookHandler = require('./server/gcal-webhook');
app.post('/api/gcal-webhook', async (req, res) => {
    try {
        await gcalWebhookHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

const cronHandler = require('./server/cron');
app.get('/api/cron', async (req, res) => {
    try {
        await cronHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

const placesHandler = require('./server/places');
app.post('/api/places/search', async (req, res) => {
    try {
        await placesHandler(req, res);
    } catch (e) {
        res.status(500).json({ error: "Server Error", details: e.message });
    }
});

const syncEventGcalHandler = require('./server/sync-event-gcal');
app.post('/api/sync-event-gcal', async (req, res) => {
    try {
        await syncEventGcalHandler(req, res);
    } catch (e) {
        console.error("Route Error sync-event-gcal:", e);
        if (!res.headersSent) res.status(500).send("Server Error");
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`
    🚀 Server running on http://localhost:${PORT}
    
    - Frontend: http://localhost:${PORT}/index.html
    - Admin:    http://localhost:${PORT}/admin.html
    - API:      http://localhost:${PORT}/api/email
    `);
});

function getReminderEmailHtml(schedule, studentName, timezone, timingLabel, scheduleTime, dateStr) {
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
          color: #8b5cf6;
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
          font-weight: 700;
          color: #718096;
          width: 90px;
        }
        .value {
          font-weight: 600;
          color: #2B2B2B;
        }
        .badge {
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          color: #8b5cf6;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          display: inline-block;
          margin-top: 10px;
        }
        .footer-note {
          font-size: 12px;
          color: #a0aec0;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="binder-rings">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="card">
          <div class="super-title">Class Reminder</div>
          <div class="title">${schedule.place}</div>
          
          <p class="text">
            Hey <strong>${studentName}</strong>, this is a quick reminder that your class starts in <strong>${timingLabel}</strong>!
          </p>

          <div class="info-box">
            <div class="info-row">
              <span class="label">Event:</span>
              <span class="value">${schedule.place}</span>
            </div>
            <div class="info-row">
              <span class="label">Date:</span>
              <span class="value">${dateStr}</span>
            </div>
            <div class="info-row">
              <span class="label">Local Time:</span>
              <span class="value">${scheduleTime}</span>
            </div>
            <div class="info-row">
              <span class="label">Timezone:</span>
              <span class="value">${timezone}</span>
            </div>
          </div>

          <div class="badge">Dynamic Timezone Active</div>
          <p class="footer-note">
            All times displayed are adjusted automatically to your configured timezone preference: <strong>${timezone}</strong>.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

setInterval(async () => {
    if (!db || !admin) return;
    try {
        console.log(`[Auto-Scheduler] Running check at ${new Date().toISOString()}...`);
        const now = new Date();

        // 1. Auto Start: 'upcoming' -> 'ongoing', and check customized student reminders
        const upcomingQuery = await db.collection('schedules')
            .where('status', '==', 'upcoming')
            .get();

        for (const doc of upcomingQuery.docs) {
            const data = doc.data();
            const date = data.date ? (data.date.toDate ? data.date.toDate() : new Date(data.date)) : null;
            if (date) {
                // Auto start logic
                if (date <= now) {
                    console.log(`[Auto-Scheduler] Auto-starting event: "${data.place}" (ID: ${doc.id})`);
                    await doc.ref.update({ status: 'ongoing' });
                    continue;
                }

                // Reminder threshold check
                const diffMs = date.getTime() - now.getTime();
                const diffMins = diffMs / (1000 * 60);

                // Load active participants
                let participants = data.participants || [];
                if (data.classId) {
                    try {
                        const classDoc = await db.collection('classes').doc(data.classId).get();
                        if (classDoc.exists) {
                            const classParticipants = classDoc.data().participants || [];
                            if (classParticipants.length > 0) {
                                participants = classParticipants;
                            }
                        }
                    } catch (e) {
                        console.warn(`[Auto-Scheduler] Failed resolving class context for class ID ${data.classId}:`, e.message);
                    }
                }

                if (participants.length > 0) {
                    for (const email of participants) {
                        const safeEmail = email.toLowerCase().replace(/\./g, '_');
                        try {
                            const userSnap = await db.collection('allowed_users').doc(email.toLowerCase()).get();
                            if (!userSnap.exists) continue;

                            const userData = userSnap.data();
                            if (userData.role !== 'student') continue;

                            // Check active toggles
                            const globalEnabled = userData.emailNotificationsEnabled !== false;
                            const remindersEnabled = userData.emailRemindersEnabled !== false;
                            if (!globalEnabled || !remindersEnabled) continue;

                             const offsets = userData.emailReminderOffsets || [12, 8];
                             
                             for (const offset of offsets) {
                                 const offsetMins = offset * 60;
                                 // Check if current minutes count is within the 10-minute check window for this offset
                                 if (diffMins <= offsetMins && diffMins > (offsetMins - 10)) {
                                     // Double sending prevention check
                                     const sentMap = data.remindersSent || {};
                                     if (sentMap[`${safeEmail}_${offset}h`]) continue;

                                     const timingLabel = `${offset} hours`;

                                     // Format start time and day in student preferred timezone
                                     const userTimezone = userData.timezone || 'Asia/Ho_Chi_Minh';
                                     const scheduleTime = date.toLocaleTimeString('en-US', {
                                         hour: '2-digit',
                                         minute: '2-digit',
                                         timeZone: userTimezone,
                                         hour12: false
                                     });
                                     const dateStr = date.toLocaleDateString('en-US', {
                                         weekday: 'short',
                                         month: 'short',
                                         day: 'numeric',
                                         timeZone: userTimezone
                                     });

                                     const studentName = userData.displayName || userData.username || email.split('@')[0];
                                     const subject = `Reminder: Class "${data.place}" starts in ${timingLabel}!`;
                                     const html = getReminderEmailHtml(data, studentName, userTimezone, timingLabel, scheduleTime, dateStr);

                                     console.log(`[Auto-Scheduler] Transmitting custom ${offset}h email reminder to ${email} for event "${data.place}"`);
                                     await sendEmail(db, email, subject, html);

                                     // Write flag
                                     await doc.ref.update({
                                         [`remindersSent.${safeEmail}_${offset}h`]: true
                                     });
                                 }
                             }
                        } catch (err) {
                            console.error(`[Auto-Scheduler] Reminders sending loop exception for user ${email}:`, err.message);
                        }
                    }
                }
            }
        }

        // 2. Auto Complete: 'ongoing' -> 'completed'
        // Triggers at 00:00 AM (start of next day) relative to the event date
        const ongoingQuery = await db.collection('schedules')
            .where('status', '==', 'ongoing')
            .get();

        for (const doc of ongoingQuery.docs) {
            const data = doc.data();
            const date = data.date ? (data.date.toDate ? data.date.toDate() : new Date(data.date)) : null;
            if (date) {
                const nextDayStart = new Date(date);
                nextDayStart.setDate(nextDayStart.getDate() + 1);
                nextDayStart.setHours(0, 0, 0, 0); // 00:00 of the next calendar day

                if (now >= nextDayStart) {
                    console.log(`[Auto-Scheduler] Auto-completing event: "${data.place}" (ID: ${doc.id})`);
                    await doc.ref.update({ status: 'completed' });
                }
            }
        }
    } catch (err) {
        console.error("[Auto-Scheduler] Error:", err.message);
    }
}, 60000);