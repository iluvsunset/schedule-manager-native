require('dotenv').config();
const { admin, getOAuthClient } = require('./server/_utils');
const { google } = require('googleapis');
const db = admin.firestore();

async function run() {
  const tokensSnap = await db.collection('gcal_tokens').get();
  for (const doc of tokensSnap.docs) {
    const uid = doc.id;
    // Find which email this uid belongs to
    const userSnap = await db.collection('allowed_users').where('uid', '==', uid).get();
    const email = userSnap.empty ? 'unknown' : userSnap.docs[0].id;
    const data = doc.data();
    console.log(`UID: ${uid} => ${email}`);
    console.log(`  scope: ${data.scope}`);
    console.log(`  webhookChannelId: ${data.webhookChannelId}`);
  }
}
run();
