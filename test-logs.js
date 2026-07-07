const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('system_logs')
    .where('type', '==', 'cron')
    .orderBy('timestamp', 'desc')
    .limit(5)
    .get();
    
  snapshot.forEach(doc => {
    console.log(doc.data().message);
    console.log(doc.data().details);
  });
}
run();
