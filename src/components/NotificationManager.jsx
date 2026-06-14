import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, or } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { isDesktopTauri } from '../platform';

export default function NotificationManager() {
  const { currentUser, userRole } = useAuth();
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!currentUser || !isDesktopTauri()) return;

    // Load the Tauri notification plugin
    let sendNotification;
    import('@tauri-apps/plugin-notification')
      .then(module => {
        sendNotification = module.sendNotification;
        return module.isPermissionGranted();
      })
      .then(granted => {
        if (!granted) {
          import('@tauri-apps/plugin-notification').then(m => m.requestPermission());
        }
      })
      .catch(err => console.warn('Tauri notification plugin not available', err));

    const q = userRole === 'student'
      ? query(
          collection(db, 'schedules'),
          or(
            where('participants', 'array-contains', currentUser.email),
            where('isGlobal', '==', true)
          )
        )
      : query(collection(db, 'schedules'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Ignore the initial fetch of all documents
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        // Only trigger notifications if the user didn't cause the change locally
        if (change.doc.metadata.hasPendingWrites) return;

        const data = change.doc.data();
        const eventName = data.place || 'An event';
        const className = data.className ? ` (${data.className})` : '';

        if (change.type === 'added') {
          if (sendNotification) sendNotification({ title: 'New Schedule Added', body: `${eventName}${className} has been added to your schedule.` });
        }
        if (change.type === 'modified') {
          if (sendNotification) sendNotification({ title: 'Schedule Updated', body: `${eventName}${className} was updated in your schedule.` });
        }
        if (change.type === 'removed') {
          if (sendNotification) sendNotification({ title: 'Schedule Cancelled', body: `${eventName}${className} was removed from your schedule.` });
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, userRole]);

  return null;
}
