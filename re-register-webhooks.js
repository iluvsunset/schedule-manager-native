require('dotenv').config();
const { admin, getOAuthClient } = require('./server/_utils');
const { google } = require('googleapis');
const db = admin.firestore();

const WEBHOOK_URL = 'https://schedule-iluvsunset.vercel.app/api/gcal-webhook';

async function run() {
  const tokensSnap = await db.collection('gcal_tokens').get();
  
  for (const doc of tokensSnap.docs) {
    const uid = doc.id;
    const data = doc.data();
    
    if (!data.refresh_token) {
      console.log(`UID ${uid}: No refresh_token, skipping`);
      continue;
    }
    
    // Check if token has calendar scope
    const hasCalScope = data.scope && (
      data.scope.includes('https://www.googleapis.com/auth/calendar.events') ||
      data.scope.includes('https://www.googleapis.com/auth/calendar')
    );
    
    if (!hasCalScope) {
      console.log(`UID ${uid}: No calendar scope (${data.scope}), deleting bad token`);
      await doc.ref.delete();
      continue;
    }
    
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(data);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Stop old channel if it exists
    if (data.webhookChannelId && data.webhookResourceId) {
      try {
        await calendar.channels.stop({ requestBody: { id: data.webhookChannelId, resourceId: data.webhookResourceId } });
        console.log(`UID ${uid}: Stopped old channel ${data.webhookChannelId}`);
      } catch(e) {
        console.log(`UID ${uid}: Could not stop old channel: ${e.message}`);
      }
    }
    
    // Register new webhook
    const channelId = `uid-${uid}-${Date.now()}`;
    try {
      const watchRes = await calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: WEBHOOK_URL,
          token: uid,  // This is what comes back as x-goog-channel-token
          expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });
      
      await doc.ref.update({
        webhookChannelId: channelId,
        webhookResourceId: watchRes.data.resourceId,
        webhookExpiration: watchRes.data.expiration,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`UID ${uid}: ✅ Registered new webhook. Channel: ${channelId}, Resource: ${watchRes.data.resourceId}`);
    } catch(e) {
      console.log(`UID ${uid}: ❌ Failed to register webhook: ${e.message}`);
    }
  }
  
  console.log('\nDone!');
}
run();
