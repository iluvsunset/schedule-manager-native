const { admin, getOAuthClient } = require('./_utils');
const { google } = require('googleapis');

const WEBHOOK_URL = 'https://schedule-iluvsunset.vercel.app/api/gcal-webhook';
const RENEW_BEFORE_MS = 24 * 60 * 60 * 1000; // Renew if expiring within 24 hours
const CHANNEL_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

module.exports = async (req, res) => {
  // Only allow GET (cron) or internal POST calls
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const db = admin.firestore();
  const now = Date.now();
  const results = { renewed: [], skipped: [], failed: [], deleted: [] };

  try {
    const tokensSnap = await db.collection('gcal_tokens').get();

    for (const doc of tokensSnap.docs) {
      const uid = doc.id;
      const data = doc.data();

      if (!data.refresh_token) {
        results.skipped.push({ uid, reason: 'No refresh_token' });
        continue;
      }

      // Check if token has calendar scope
      const hasCalScope = data.scope && (
        data.scope.includes('https://www.googleapis.com/auth/calendar.events') ||
        data.scope.includes('https://www.googleapis.com/auth/calendar')
      );

      if (!hasCalScope) {
        console.log(`[renew-webhooks] UID ${uid}: No calendar scope, deleting`);
        await doc.ref.delete();
        results.deleted.push({ uid, reason: 'No calendar scope' });
        continue;
      }

      // Check if renewal is needed
      const expiration = data.webhookExpiration ? parseInt(data.webhookExpiration) : 0;
      const needsRenewal = !expiration || (expiration - now) < RENEW_BEFORE_MS;

      if (!needsRenewal) {
        const hoursLeft = Math.round((expiration - now) / 3600000);
        results.skipped.push({ uid, reason: `Still valid for ${hoursLeft}h` });
        continue;
      }

      // Renew the webhook
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials(data);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Stop old channel if it exists
      if (data.webhookChannelId && data.webhookResourceId) {
        try {
          await calendar.channels.stop({
            requestBody: { id: data.webhookChannelId, resourceId: data.webhookResourceId }
          });
          console.log(`[renew-webhooks] UID ${uid}: Stopped old channel`);
        } catch (e) {
          console.log(`[renew-webhooks] UID ${uid}: Could not stop old channel: ${e.message}`);
        }
      }

      // Register new channel
      const channelId = `uid-${uid}-${now}`;
      try {
        const watchRes = await calendar.events.watch({
          calendarId: 'primary',
          requestBody: {
            id: channelId,
            type: 'web_hook',
            address: WEBHOOK_URL,
            token: uid,
            expiration: String(now + CHANNEL_LIFETIME_MS)
          }
        });

        await doc.ref.update({
          webhookChannelId: channelId,
          webhookResourceId: watchRes.data.resourceId,
          webhookExpiration: watchRes.data.expiration,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[renew-webhooks] UID ${uid}: ✅ Renewed. Expires: ${new Date(parseInt(watchRes.data.expiration)).toISOString()}`);
        results.renewed.push({ uid, channelId, expiration: watchRes.data.expiration });
      } catch (e) {
        console.error(`[renew-webhooks] UID ${uid}: ❌ Failed: ${e.message}`);
        results.failed.push({ uid, error: e.message });
      }
    }

    return res.status(200).json({ success: true, ...results });
  } catch (error) {
    console.error('[renew-webhooks] Fatal error:', error);
    return res.status(500).json({ error: error.message });
  }
};
