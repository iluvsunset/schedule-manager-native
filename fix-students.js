const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const fbSnap = await db.collection('schedules').where('place', '==', 'Tutor Bin').get();
  for (const doc of fbSnap.docs) {
    const data = doc.data();
    if (data.exportedGcalEventId || (data.gcalEventIds && Object.keys(data.gcalEventIds).length > 0)) {
      console.log(`Event ${doc.id} has exported events!`);
      console.log('exportedGcalEventId:', data.exportedGcalEventId);
      console.log('gcalEventIds:', data.gcalEventIds);
      console.log('participants:', data.participants);
    }
  }
}
run();
