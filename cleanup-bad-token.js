require('dotenv').config();
const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  await db.collection('gcal_tokens').doc('PL0gz7PfSbhaYxZVYdcAh0e7gS72').delete();
  console.log('Deleted bad token');
}
run();
