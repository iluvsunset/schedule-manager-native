require('dotenv').config();
const { admin, getOAuthClient } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const users = await db.collection('gcal_tokens').get();
  for (const doc of users.docs) {
    if (doc.id !== 'PL0gz7PfSbhaYxZVYdcAh0e7gS72') continue;
    console.log(`User: ${doc.id}`);
    console.log(doc.data().webhook_channel_id);
    console.log(doc.data().webhook_resource_id);
  }
}
run();
