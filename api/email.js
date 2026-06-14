const admin = require('firebase-admin');
const { sendEmail } = require('./_utils');

// --- 1. CHRONOS TEMPLATE ENGINE (Responsive Notebook Canvas) ---
function getTemplate(type, data) {
  let title = "Notification";
  let body = "";
  let btnText = "Open Dashboard";
  let btnLink = data.link || "https://schedule-iluvsunset.vercel.app/";

  // Content Logic
  switch (type) {
    case 'schedule_created':
      title = "New Schedule";
      body = `
        <h2 class="class-title">${data.place}</h2>
        <p class="text">A new class session has been scheduled. Details are listed below:</p>
        <div class="info-box">
          <div class="info-row">
            <span class="label">Time</span>
            <span class="value">${data.time || 'All Day'}</span>
          </div>
          <div class="info-row">
            <span class="label">Date</span>
            <span class="value">${data.date}</span>
          </div>
        </div>
        ${data.notes ? `
          <div class="notes-box">
            <div class="notes-header">Teacher's Note</div>
            <p class="notes-text">${data.notes}</p>
          </div>
        ` : ''}
      `;
      btnText = "View Details";
      break;

    case 'schedule_reminder':
      title = "Class Reminder";
      body = `
        <h2 class="class-title">${data.place}</h2>
        <p class="text">Just a heads up! You have a class starting soon.</p>
        <div class="info-box">
          <div class="info-row">
            <span class="label">Time</span>
            <span class="value">${data.time}</span>
          </div>
          <div class="info-row">
            <span class="label">Date</span>
            <span class="value">${data.date}</span>
          </div>
        </div>
      `;
      btnText = "Check In";
      break;

    case 'class_invite':
      title = "Class Invitation";
      body = `
        <div style="text-align: center;">
          <p class="text">You have been added to a classroom:</p>
          <h1 class="big-title">${data.class_name}</h1>
          <p class="subtext">You will now receive automatic updates and class reminders.</p>
        </div>
      `;
      btnText = "Accept Invitation";
      break;

    case 'review_sent':
      title = "Feedback Received";
      body = `
        <h2 class="class-title">${data.place}</h2>
        <p class="text">New feedback notes have been sent by your teacher:</p>
        <div class="quote-box">
          <div class="quote-label">Teacher's Feedback</div>
          <div class="quote">"${data.review_snippet || 'Check dashboard...'}"</div>
        </div>
      `;
      btnText = "Read Feedback";
      break;

    case 'test_email':
      title = "System Test";
      body = `<p class="text" style="text-align:center;">Secure backend connection verified successfully. All systems operational!</p>`;
      break;
  }

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
        .subtext {
          font-size: 14px;
          color: #718096;
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
        .notes-box {
          background-color: #FFFDF5;
          border: 2px solid #2B2B2B;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
          text-align: left;
          border-left: 6px solid #FFC01E;
        }
        .notes-header {
          font-family: 'Fredoka', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #FFC01E;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .notes-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: #4A5568;
        }
        .quote-box {
          background-color: #F7FAFC;
          border: 2px solid #2B2B2B;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          text-align: left;
          border-left: 6px solid #4299E1;
        }
        .quote-label {
          font-family: 'Fredoka', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #4299E1;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .quote {
          font-style: italic;
          color: #2B2B2B;
          line-height: 1.6;
          margin: 0;
        }
        .big-title {
          font-family: 'Fredoka', sans-serif;
          font-size: 32px;
          font-weight: 800;
          margin: 16px 0;
          color: #2B2B2B;
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
          <div class="super-title">${title}</div>
          
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

// --- 2. CREDENTIALS HELPER ---
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
  } catch (e) {
    console.error("FATAL: Credential Error", e);
    return null;
  }
}

// Init Firebase
if (!admin.apps.length) {
  try {
    const sa = getServiceAccount();
    if (sa) admin.initializeApp({ credential: admin.credential.cert(sa) });
  } catch (e) { console.error(e); }
}

// --- 3. MAIN HANDLER ---
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
    console.log("Email handler started processing request...");
    if (!admin.apps.length) throw new Error("Server Config Error: Firebase Admin missing.");

    // Auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing Token' });
    const idToken = authHeader.split('Bearer ')[1];
    await admin.auth().verifyIdToken(idToken);

    // Params
    const { to_email, to_name, subject, email_type, template_data } = req.body;
    let { html_content } = req.body;

    if (!to_email || !subject) return res.status(400).json({ error: 'Missing fields' });

    // GENERATE TEMPLATE IF DATA PROVIDED
    if (email_type && template_data) {
      console.log(`Generating template for ${email_type}`);
      html_content = getTemplate(email_type, template_data);
    } else if (!html_content) {
      html_content = "<p>No content provided.</p>";
    }

    // DB Access
    console.log("Accessing Firestore DB...");
    const db = admin.firestore();
    try {
      db.settings({ preferRest: true });
      console.log("Set preferRest: true successfully.");
    } catch (e) {
      console.log("Could not set preferRest settings (already initialized):", e.message);
    }

    // 6. Permission Check & Sender Config
    let senderEmail = "bao.ly10@truongvietanh.com"; // Default

    // Get Sender Config
    console.log("Fetching doc: system_settings/email_config...");
    const configSnap = await db.collection('system_settings').doc('email_config').get();
    console.log("Fetched email_config doc. Exists:", configSnap.exists);
    if (configSnap.exists && configSnap.data().sender_email) {
      senderEmail = configSnap.data().sender_email;
      console.log("Sender email resolved to:", senderEmail);
    }

    if (email_type) {
      console.log(`Checking allowed_users role for: ${to_email.toLowerCase()}`);
      const recSnap = await db.collection('allowed_users').doc(to_email.toLowerCase()).get();
      const role = recSnap.exists ? recSnap.data().role : 'student';
      console.log(`Role for ${to_email}: ${role}`);

      console.log("Checking mail_rules...");
      const ruleSnap = await db.collection('system_settings').doc('mail_rules').get();
      console.log("mail_rules doc exists:", ruleSnap.exists);
      if (ruleSnap.exists && ruleSnap.data()[`${email_type}_${role}`] === false) {
        console.log("Email suppressed by mail rule.");
        return res.status(200).json({ success: false, message: 'Suppressed by rule' });
      }
    }

    // --- STRICT SMTP SENDER ENGINE ---
    console.log("Sending email via SMTP...");
    await sendEmail(db, to_email, subject, html_content);
    
    // Add system log on success
    try {
      await db.collection('system_logs').add({
        type: 'email',
        to: to_email,
        subject: subject,
        email_type: email_type || 'custom',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log("System log added for successful email.");
    } catch (logErr) {
      console.error("Failed to add system log for email:", logErr.message);
    }

    return res.status(200).json({ success: true, method: 'SMTP' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
