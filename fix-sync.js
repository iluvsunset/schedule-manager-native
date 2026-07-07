require('dotenv').config();
const { admin } = require('./server/_utils');
const db = admin.firestore();

async function run() {
  console.log('Fetching live events from Vercel API...');
  const response = await fetch('https://schedule-iluvsunset.vercel.app/api/gcal-events?uid=PL0gz7PfSbhaYxZVYdcAh0e7gS72');
  const data = await response.json();
  const gcalEvents = data.items || [];
  
  const fbSnap = await db.collection('schedules').where('userId', '==', 'PL0gz7PfSbhaYxZVYdcAh0e7gS72').get();
  let updatedCount = 0;
  
  for (const fbDoc of fbSnap.docs) {
    const fbData = fbDoc.data();
    if (!fbData.gcalEventId) continue;
    
    const gcalMatch = gcalEvents.find(e => e.id === fbData.gcalEventId);
    if (gcalMatch && gcalMatch.start) {
      const gcalDate = gcalMatch.start.dateTime ? new Date(gcalMatch.start.dateTime) : new Date(gcalMatch.start.date);
      const fbDate = fbData.date.toDate();
      
      if (gcalDate.getTime() !== fbDate.getTime()) {
        console.log(`Fixing mismatched event: ${fbData.place} (${fbData.gcalEventId})`);
        console.log(`- Old Date: ${fbDate.toISOString()}`);
        console.log(`- New Date: ${gcalDate.toISOString()}`);
        await db.collection('schedules').doc(fbDoc.id).update({
          date: admin.firestore.Timestamp.fromDate(gcalDate)
        });
        updatedCount++;
      }
    }
  }
  console.log(`Successfully fixed ${updatedCount} out-of-sync events!`);
}
run();
