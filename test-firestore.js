require('dotenv').config({ path: '.env.local' });
const { admin } = require('./api/_utils.js');

async function test() {
  try {
    console.log('Writing to Firestore...');
    await admin.firestore().collection('auth_sessions').doc('test').set({
      test: true
    });
    console.log('Success!');
  } catch (e) {
    console.error(e);
  }
}
test();
