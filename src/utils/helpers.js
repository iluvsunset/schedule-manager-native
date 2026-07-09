import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getApiBase } from '../platform';

export function formatTime(date, tz) {
  if (!date) return '';
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  const timeZone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
}

export function formatDate(date, tz) {
  if (!date) return '';
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  const timeZone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
}

export function getRelativeTime(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const scheduleDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((scheduleDay - today) / (1000 * 60 * 60 * 24));
  
  if (d - now > 0 && d - now < 3600000) return 'Starting soon';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
  return null;
}

export function showMessage(msg, type = 'success') {
  const div = document.createElement('div');
  div.className = `toast-message ${type === 'success' ? 'toast-success' : 'toast-error'}`;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => {
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 300);
  }, 2700);
}

export async function sendDynamicEmail(currentUser, to_email, to_name, subject, template_data, email_type) {
  try {
    const settingsSnap = await getDoc(doc(db, 'system_settings', 'config'));
    const emailsEnabled = settingsSnap.exists() ? (settingsSnap.data().emailEnabled !== false) : true;
    if (!emailsEnabled || !currentUser) return false;

    // Fetch user settings/preferences to verify if they have overridden email delivery
    const userSnap = await getDoc(doc(db, 'allowed_users', to_email.toLowerCase()));
    if (userSnap.exists()) {
      const userData = userSnap.data();
      
      // Global user preference override: if user explicitly turned off notifications
      if (userData.emailNotificationsEnabled === false) {
        console.log(`Email blocked by user preference (global notifications disabled): ${to_email}`);
        return false;
      }
      
      // Category specific overrides
      if (email_type === 'schedule_reminder' && userData.emailRemindersEnabled === false) {
        console.log(`Email blocked by user preference (reminders disabled): ${to_email}`);
        return false;
      }
      if (email_type === 'schedule_created' && userData.emailClassUpdatesEnabled === false) {
        console.log(`Email blocked by user preference (class updates disabled): ${to_email}`);
        return false;
      }
    }

    // Check custom rules
    const rulesSnap = await getDoc(doc(db, 'system_settings', 'mail_rules'));
    if (rulesSnap.exists()) {
      const rules = rulesSnap.data();
      const role = userSnap.exists() ? userSnap.data().role : 'student';
      const ruleKey = `${email_type}_${role}`;
      if (rules[ruleKey] === false) {
        console.log(`Email blocked by rule: ${ruleKey}`);
        return false; // Blocked by rule
      }
    }

    const idToken = await currentUser.getIdToken();
    const apiBase = getApiBase();
    const response = await fetch(`${apiBase}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ to_email, to_name, subject, email_type, template_data })
    });

    if (!response.ok) throw new Error("Server Error");
    return true;
  } catch (error) {
    console.error("Email failed:", error);
    return false;
  }
}

export async function syncGcalBackground(schedule, scheduleId, action = 'sync') {
  try {
    const apiBase = getApiBase();
    fetch(`${apiBase}/api/sync-event-gcal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule, scheduleId, action })
    }).catch(err => console.error("GCal Background Sync Failed:", err));
  } catch (e) {
    console.error("GCal sync trigger failed", e);
  }
}

