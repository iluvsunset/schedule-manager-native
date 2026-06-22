const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Helper to get service account credentials
function getServiceAccount() {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
    const localPath = path.resolve(__dirname, '../service-account.json');
    if (fs.existsSync(localPath)) {
      return require(localPath);
    }
  } catch (e) {
    console.error("Error parsing service account:", e.message);
  }
  return null;
}

const sa = getServiceAccount();

if (sa) {
  admin.initializeApp({
    credential: admin.credential.cert(sa)
  });
} else {
  console.log("No service account found in environment or local file.");
  console.log("Attempting default initialization...");
  admin.initializeApp({
    projectId: 'sunsetmyfav'
  });
}

const db = admin.firestore();

const message = `🚀 Chronos Upgrade Released! (v0.1.2)
• Integrated Profile Settings Page: Easily configure your Display Name, Username, and custom Location & Timezone context.
• Location-Based Cron Reminders: Automatic reminder emails are now dispatched precisely relative to your custom timezone.
• Custom UI Select Components: Implemented state-driven dropdown selectors with fluid Framer Motion animations.
• Shimmer Skeleton Loading: Added custom layout shimmer loaders to avoid visual jank and layout shifts during fetching.
• New Email Reschedule & Cancel Templates: Verified simulated reschedule/cancellation templates in the admin control matrix.`;

async function broadcast() {
  try {
    console.log("Broadcasting changelog announcement...");
    const announceRef = db.collection('system_settings').doc('announcements');
    await announceRef.set({
      message: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("✨ Announcement successfully broadcast to all users!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to broadcast announcement:", err.message);
    console.error("\nTo run this script locally, make sure you have FIREBASE_SERVICE_ACCOUNT environment variable set, or a service-account.json in the project root.");
    process.exit(1);
  }
}

broadcast();
