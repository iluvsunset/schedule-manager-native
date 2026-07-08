require('dotenv').config();
const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const cSnap = await db.collection('classes').doc('ro3jYXdaSrNogWwpQ57z').get();
  console.log(cSnap.data());
}
run();
