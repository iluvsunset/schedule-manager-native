const { google } = require('googleapis');
const crypto = require('crypto');
const { getOAuthClient, admin } = require('./_utils');

function getSuccessHtml(isDeepLink = false, deepLinkUrl = '') {
  const scriptTag = isDeepLink
    ? '<script>window.location.href = "' + deepLinkUrl + '"; setTimeout(function() { window.close(); }, 2000);</script>'
    : '<script>setTimeout(function() { window.close(); }, 1500);</script>';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Authentication Successful</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 0; height: 100vh;
            background: radial-gradient(circle at 50% 0%, #1a1a2e 0%, #050505 80%);
            color: #ffffff;
            font-family: 'Inter', sans-serif;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            overflow: hidden;
          }
          /* Animated background blobs */
          .blob {
            position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; z-index: -1;
            animation: float 10s ease-in-out infinite alternate;
          }
          .blob.blue { background: #3b82f6; width: 400px; height: 400px; top: -100px; left: -100px; animation-delay: 0s; }
          .blob.purple { background: #8b5cf6; width: 300px; height: 300px; bottom: -50px; right: -50px; animation-delay: -5s; }
          
          @keyframes float {
            0% { transform: translate(0, 0) scale(1); }
            100% { transform: translate(30px, 50px) scale(1.1); }
          }
          
          .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 40px;
            text-align: center;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
            transform: translateY(20px);
          }

          @keyframes slideUp {
            to { opacity: 1; transform: translateY(0); }
          }

          .icon-container {
            width: 80px; height: 80px;
            margin: 0 auto 24px;
            background: linear-gradient(135deg, #22c55e, #10b981);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.4);
            animation: pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: .8; transform: scale(1.05); box-shadow: 0 0 50px rgba(34, 197, 94, 0.6); }
          }

          .icon-container svg { width: 40px; height: 40px; color: white; }
          
          h1 { margin: 0 0 12px; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
          p { margin: 0; color: #a1a1aa; font-size: 16px; line-height: 1.5; font-weight: 400; }
          
          .button {
            display: inline-block; margin-top: 32px;
            padding: 14px 28px; border-radius: 12px;
            background: rgba(255, 255, 255, 0.1);
            color: white; font-weight: 500; text-decoration: none;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.2s ease;
            cursor: pointer;
          }
          .button:hover { background: rgba(255, 255, 255, 0.15); transform: translateY(-1px); }
        </style>
        ${scriptTag}
      </head>
      <body>
        <div class="blob blue"></div>
        <div class="blob purple"></div>
        
        <div class="card">
          <div class="icon-container">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1>Successfully Connected</h1>
          <p>Your Google Calendar is securely linked. You can safely close this window and return to the app.</p>
          
          <button class="button" onclick="window.close()">Close Window</button>
        </div>
      </body>
    </html>
  `;
}

module.exports = async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  try {
    const oauth2Client = getOAuthClient('/api/native-google-callback');
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user profile info
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    if (!userInfo || !userInfo.email) {
      throw new Error("Could not retrieve email from Google.");
    }

    let firebaseUser;
    try {
      // Check if user exists
      firebaseUser = await admin.auth().getUserByEmail(userInfo.email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create user if they don't exist
        firebaseUser = await admin.auth().createUser({
          email: userInfo.email,
          emailVerified: true,
          displayName: userInfo.name || '',
          photoURL: userInfo.picture || '',
        });
      } else {
        throw error;
      }
    }

    // Create a custom token
    // We must use 'custom_email' because 'email' is a reserved claim and will be stripped by Firebase
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid, {
      custom_email: userInfo.email,
    });
    const uid = firebaseUser.uid;

    const hasCalendarScope = tokens.scope && tokens.scope.includes('https://www.googleapis.com/auth/calendar.events');

    if (hasCalendarScope) {
      // 1. Save GCal Tokens for Background Webhook Sync
      const db = admin.firestore();
      const tokenRef = db.collection('gcal_tokens').doc(uid);
      await tokenRef.set({
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expiry_date: tokens.expiry_date,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // 2. Register Webhook for Push Notifications
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const channelId = crypto.randomUUID();
      const webhookUrl = 'https://schedule-iluvsunset.vercel.app/api/gcal-webhook';
      
      try {
        await calendar.events.watch({
          calendarId: 'primary',
          requestBody: {
            id: channelId,
            type: 'web_hook',
            address: webhookUrl,
            token: uid, // Pass uid so webhook knows whose calendar was updated
          }
        });
        console.log(`Registered GCal webhook for Native User: ${uid}`);
      } catch (watchErr) {
        console.error('Failed to register webhook:', watchErr.message);
      }
    }

    const { state } = req.query;
    
    if (state === 'tauri-redirect') {
      res.redirect(`http://localhost:3000/?token=${customToken}`);
      return;
    }
    
    if (state && state !== 'dev' && state !== 'prod') {
      const sessionId = state;
      // Store token in auth_sessions collection
      await admin.firestore().collection('auth_sessions').doc(sessionId).set({
        token: customToken,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.setHeader('Content-Type', 'text/html');
      res.send(getSuccessHtml(false));
      return;
    }

    // Fallback for legacy deep links (prod or dev)
    const scheme = state === 'dev' ? 'sunset-schedule-dev' : 'sunset-schedule';
    const deepLink = `${scheme}://auth?token=${customToken}`;
    res.setHeader('Content-Type', 'text/html');
    res.send(getSuccessHtml(true, deepLink));
  } catch (error) {
    console.error('Error in native-google-callback:', error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
};
