require('dotenv').config();
const { admin, getOAuthClient } = require('./server/_utils');
const { google } = require('googleapis');
const db = admin.firestore();

async function run() {
  const users = await db.collection('gcal_tokens').get();
  for (const doc of users.docs) {
    if (doc.id !== 'PL0gz7PfSbhaYxZVYdcAh0e7gS72') continue; // Only process phangiabaoa8
    
    // We don't have GCAL_CLIENT_ID in env, but we can bypass googleapis and just query the local server if we make a mock request!
    console.log("Mocking request...");
  }
}
run();
