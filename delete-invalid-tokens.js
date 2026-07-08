const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./service-account.json')) });
const db = admin.firestore();

async function removeTokens() {
  const users = await admin.auth().getUsers([
    { email: 'phangiabao261103@gmail.com' },
    { email: 'idk684750@gmail.com' }
  ]);
  for (const user of users.users) {
    await db.collection('gcal_tokens').doc(user.uid).delete();
    console.log('Deleted gcal_tokens for', user.email);
  }
}
removeTokens().catch(console.error);
