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

const message = `🚀 Chronos Upgrade Released!
• Unified Desktop & Web Experience: Deprecated the mobile dashboard for a single, fully responsive dashboard.
• Calendar Quick Actions: Clicking a calendar day now opens a compact card listing events with immediate action buttons (Start, Complete, Cancel, Delete, Details).
• Detail Modal Toolbar: Manage events directly from the Detail Modal with a beautiful bottom action toolbar.`;

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
