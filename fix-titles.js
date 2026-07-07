require('dotenv').config();
const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  const fbSnap = await db.collection('schedules').get();
  let updatedCount = 0;
  for (const doc of fbSnap.docs) {
    const data = doc.data();
    if (data.place && typeof data.place === 'string') {
      let newPlace = data.place;
      while (newPlace.startsWith('Class: ')) {
        newPlace = newPlace.substring(7); // remove "Class: "
      }
      
      let newOriginalSummary = data.originalSummary;
      if (newOriginalSummary && typeof newOriginalSummary === 'string') {
        while (newOriginalSummary.startsWith('Class: ')) {
          newOriginalSummary = newOriginalSummary.substring(7);
        }
      }

      if (newPlace !== data.place) {
        console.log(`Fixing ${doc.id}: "${data.place}" -> "${newPlace}"`);
        await doc.ref.update({
          place: newPlace,
          originalSummary: newOriginalSummary || newPlace
        });
        updatedCount++;
      }
    }
  }
  console.log(`Cleaned up ${updatedCount} events!`);
}
run();
