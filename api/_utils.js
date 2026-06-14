// @ts-nocheck
const admin = require('firebase-admin');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

function getServiceAccount() {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIREBASE_SERVICE_ACCOUNT.includes('"private_key": "..."')) {
      const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');
      console.log('[Firebase] Loaded service account from env var');
      return creds;
    }
    const fs = require('fs');
    const path = require('path');
    // Try cwd first, then __dirname (parent of /api)
    const paths = [
      path.resolve(process.cwd(), 'service-account.json'),
      path.resolve(__dirname, '..', 'service-account.json'),
      path.resolve(__dirname, 'service-account.json'),
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        console.log('[Firebase] Loaded service account from file:', p);
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    }
    console.error('[Firebase] No service account found. Tried env var and paths:', paths);
    return null;
  } catch (e) {
    console.error('[Firebase] Error loading service account:', e.message);
    return null;
  }
}

function initAdmin() {
  if (!admin.apps.length) {
    try {
      const sa = getServiceAccount();
      if (sa) {
        admin.initializeApp({ credential: admin.credential.cert(sa) });
        console.log('[Firebase] Admin SDK initialized successfully');
      } else {
        console.error('[Firebase] No service account available, admin SDK NOT initialized');
      }
    } catch (e) {
      console.error('[Firebase] Failed to initialize admin SDK:', e.message);
    }
  }
  return admin;
}

function getOAuthClient(callbackPath = '/api/gcal-callback') {
  // We need the user to configure these env variables in Vercel.
  const clientId = process.env.GCAL_CLIENT_ID;
  const clientSecret = process.env.GCAL_CLIENT_SECRET;
  
  // For production, the redirect URI will be the vercel domain.
  // For local development, it can be localhost.
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}${callbackPath}`
    : (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development')
      ? `http://localhost:3000${callbackPath}`
      : `https://schedule-iluvsunset.vercel.app${callbackPath}`;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function sendEmail(db, to_email, subject, html_content) {
  // Get Sender Config
  let senderEmail = "bao.ly10@truongvietanh.com"; // Default fallback
  try {
    const configSnap = await db.collection('system_settings').doc('email_config').get();
    if (configSnap.exists && configSnap.data().sender_email) {
      senderEmail = configSnap.data().sender_email;
    }
  } catch (err) {
    console.error("Error fetching email_config:", err.message);
  }

  // Get SMTP Config
  const smtpSnap = await db.collection('system_settings').doc('smtp_config').get();
  if (!smtpSnap.exists) {
    throw new Error("SMTP configuration not found in Firestore.");
  }
  const smtpConfig = smtpSnap.data();

  if (!smtpConfig.enabled || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    throw new Error("SMTP is disabled or missing credentials in Firestore.");
  }

  const isSecure = parseInt(smtpConfig.port) === 465;

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: parseInt(smtpConfig.port),
    secure: isSecure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    }
  });

  const result = await transporter.sendMail({
    from: `"Schedule Manager" <${senderEmail}>`,
    to: to_email,
    subject: subject,
    html: html_content
  });
  
  return result;
}

module.exports = {
  admin: initAdmin(),
  getOAuthClient,
  sendEmail
};

