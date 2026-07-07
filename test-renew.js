require('dotenv').config();
const { admin, getOAuthClient } = require('./server/_utils');
const { google } = require('googleapis');
const crypto = require('crypto');
const db = admin.firestore();

async function run() {
  const doc = await db.collection('gcal_tokens').doc('PL0gz7PfSbhaYxZVYdcAh0e7gS72').get();
  const tokenData = doc.data();
  
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ 
    refresh_token: tokenData.refresh_token,
    access_token: tokenData.access_token
  });
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const webhookUrl = 'https://schedule-iluvsunset.vercel.app/api/gcal-webhook';
  const newChannelId = crypto.randomUUID();
  
  try {
    const watchRes = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: newChannelId,
        type: 'web_hook',
        address: webhookUrl,
        token: doc.id
      }
    });
    
    await doc.ref.update({
      webhookChannelId: watchRes.data.id,
      webhookResourceId: watchRes.data.resourceId,
      webhookExpiration: watchRes.data.expiration,
    });
    console.log('SUCCESSFULLY RENEWED WEBHOOK!');
    console.log('New expiration:', watchRes.data.expiration);
  } catch (error) {
    console.error('Failed to renew:', error);
  }
}
run();
