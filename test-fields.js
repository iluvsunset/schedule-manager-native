const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const doc = await db.collection('gcal_tokens').doc('PL0gz7PfSbhaYxZVYdcAh0e7gS72').get();
  console.log(Object.keys(doc.data()));
}
run();
