const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('schedules').where('place', '==', 'Tutor Bin').limit(1).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`userEmail: ${data.userEmail}`);
    console.log(`userId: ${data.userId}`);
  });
}
run();
