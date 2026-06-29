// @ts-nocheck
const { admin, getOAuthClient } = require('./_utils');
const { google } = require('googleapis');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    console.error('Google Auth Error:', error);
    return res.redirect('/?gcal_error=Access+Denied');
  }

  if (!code || !state) {
    return res.status(400).send('Missing code or state parameter.');
  }

  const [uid, clientType] = state.split('|');

  try {
    const oauth2Client = getOAuthClient();
    
    // Exchange the code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const db = admin.firestore();
    
    // 1. Save Tokens to Firestore
    // We store tokens in a separate secure collection since allowed_users is publicly readable (or at least partially).
    const tokenRef = db.collection('gcal_tokens').doc(uid);
    await tokenRef.set({
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 2. Register Webhook for Push Notifications
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const channelId = crypto.randomUUID(); // Unique channel ID
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/gcal-webhook`
      : process.env.VERCEL_ENV === 'development'
        ? 'http://localhost:5173/api/gcal-webhook'
        : 'https://schedule-iluvsunset.vercel.app/api/gcal-webhook';
    
    // Note: The Webhook URL domain MUST be verified in the Google Cloud Console.
    try {
      const watchRes = await calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          // Optional: Token to verify the webhook request actually came from Google
          token: uid, // We pass the uid so the webhook knows WHOSE calendar was updated!
        }
      });
      
      // Save the active channel info
      await tokenRef.set({
        webhookChannelId: watchRes.data.id,
        webhookResourceId: watchRes.data.resourceId,
        webhookExpiration: watchRes.data.expiration,
      }, { merge: true });

    } catch (watchError) {
      console.error('Failed to register Webhook channel:', watchError.message);
      // We continue anyway, because the token was saved. We can retry watching later if needed.
    }

    // Redirect the user back to the dashboard with a success flag
    if (clientType === 'native') {
      res.send(`
        <html>
          <body style="font-family: system-ui, sans-serif; text-align: center; padding-top: 50px; background: #0A0A0A; color: white;">
            <div style="background: #111; border: 1px solid #333; border-radius: 12px; padding: 30px; max-width: 400px; margin: 0 auto;">
              <div style="font-size: 40px; margin-bottom: 15px;">✅</div>
              <h2 style="margin: 0 0 10px 0;">Google Calendar Connected!</h2>
              <p style="color: #888; margin: 0;">You can now safely close this window and return to the application.</p>
            </div>
            <script>
              setTimeout(() => {
                window.close();
              }, 100);
            </script>
          </body>
        </html>
      `);
    } else {
      res.redirect('/?gcal_success=true');
    }
  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).send('Authentication failed: ' + err.message);
  }
};
