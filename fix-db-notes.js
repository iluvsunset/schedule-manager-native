const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./service-account.json')) });
const db = admin.firestore();

async function fixNotes() {
  const snaps = await db.collection('schedules').get();
  let count = 0;
  for (const doc of snaps.docs) {
    const data = doc.data();
    if (data.notes && (data.notes.includes('Managed by Schedule Manager') || data.notes.includes('📚 Class:'))) {
      let cleanNotes = data.notes;
      
      // Remove Class lines
      cleanNotes = cleanNotes.replace(/📚 Class:.*?(?:\n|$)/g, '');
      
      // Remove Notes prefix
      cleanNotes = cleanNotes.replace(/📝 Notes:\s*/g, '');
      
      // Remove Managed by
      cleanNotes = cleanNotes.replace(/Managed by Schedule Manager\.?/g, '');
      
      // Clean up whitespace
      cleanNotes = cleanNotes.trim();
      
      if (!cleanNotes) cleanNotes = 'None';
      
      await doc.ref.update({ notes: cleanNotes });
      count++;
      console.log(`Cleaned doc ${doc.id}: new notes => "${cleanNotes}"`);
    }
  }
  console.log(`\nFixed ${count} schedules in total.`);
}
fixNotes().catch(console.error);
