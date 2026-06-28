import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signInWithCustomToken, signOut, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { auth, db, provider } from '../firebase';
import { openGCalAuth, openNativeGoogleAuth, isNative, isTauri, isDesktopTauri, isCapacitor } from '../platform';
import { showMessage } from '../utils/helpers';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const STATIC_PERMISSIONS = {
  it: {
    create_schedule: true,
    edit_schedule: true,
    delete_schedule: true,
    invite_user: true,
    manage_classes: true,
    manage_system: true,
    connect_gcal: true,
    view_console: true,
    view_all: true
  },
  academic_coordinator: {
    create_schedule: true,
    edit_schedule: true,
    delete_schedule: true,
    invite_user: true,
    manage_classes: true,
    manage_system: false,
    connect_gcal: false,
    view_console: true,
    view_all: true
  },
  senior_teacher: {
    create_schedule: true,
    edit_schedule: true,
    delete_schedule: true,
    invite_user: true,
    manage_classes: true,
    manage_system: false,
    connect_gcal: true,
    view_console: true,
    view_all: true
  },
  teacher: {
    create_schedule: true,
    edit_schedule: true,
    delete_schedule: true,
    invite_user: false,
    manage_classes: false,
    manage_system: false,
    connect_gcal: true,
    view_console: false,
    view_all: false
  },
  student: {
    create_schedule: false,
    edit_schedule: false,
    delete_schedule: false,
    invite_user: false,
    manage_classes: false,
    manage_system: false,
    connect_gcal: false,
    view_console: false,
    view_all: false
  }
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userUsername, setUserUsername] = useState(null);
  const [userDisplayName, setUserDisplayName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dynamicOverrides, setDynamicOverrides] = useState({});
  const [isGcalConnected, setIsGcalConnected] = useState(false);

  const sessionStartTime = useRef(Date.now());

  // Track the latest auth callback to prevent stale/duplicate Firestore calls.
  // getIdToken(true) can re-trigger onAuthStateChanged, causing two async
  // callbacks to race and open duplicate WebChannels.
  const authCallbackId = useRef(0);

  useEffect(() => {
    // 1. Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      const myCallbackId = ++authCallbackId.current;

      if (user) {
        const MAX_RETRIES = 3;
        let lastError = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          if (myCallbackId !== authCallbackId.current) return;

          try {
            // Get a fresh ID token for the REST API call
            const idToken = await user.getIdToken(attempt > 0);
            if (myCallbackId !== authCallbackId.current) return;

            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, 800 * attempt));
              if (myCallbackId !== authCallbackId.current) return;
            }

            // Use Firestore REST API directly instead of getDoc to avoid
            // the WebChannel opening a persistent streaming connection
            // that gets cancelled for users with no active listeners.
            const email = user.email.toLowerCase();
            const res = await fetch(
              `https://firestore.googleapis.com/v1/projects/sunsetmyfav/databases/(default)/documents/allowed_users/${encodeURIComponent(email)}`,
              { headers: { 'Authorization': `Bearer ${idToken}` } }
            );

            if (myCallbackId !== authCallbackId.current) return;

            let role = null;
            let username = null;
            let displayName = null;
            if (res.ok) {
              const docData = await res.json();
              // Firestore REST API returns fields in { fieldName: { stringValue: "..." } } format
              const roleField = docData.fields?.role?.stringValue;
              if (roleField) {
                role = roleField.toLowerCase().trim();
              }
              username = docData.fields?.username?.stringValue || null;
              displayName = docData.fields?.displayName?.stringValue || null;
            }
            
            if (user.email.toLowerCase() === 'bao.h0146824@gmail.com' || user.email.toLowerCase() === 'sunsetmyfav@gmail.com') {
              role = 'it';
            }
            
            if (role) {
              sessionStartTime.current = Date.now();
              setCurrentUser(user);
              setUserRole(role);
              setUserUsername(username);
              setUserDisplayName(displayName);
            } else {
              showMessage('Access Denied: Your account is not authorized to use this application.', 'error');
              await signOut(auth);
              setCurrentUser(null);
              setUserRole(null);
              setUserUsername(null);
              setUserDisplayName(null);
            }
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            console.warn(`Auth role fetch attempt ${attempt + 1}/${MAX_RETRIES} failed:`, error.message);
          }
        }

        if (lastError) {
          console.error("All auth role fetch attempts failed:", lastError);
          setCurrentUser(null);
          setUserRole(null);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserUsername(null);
        setUserDisplayName(null);
        setIsGcalConnected(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // 1.5 Real-time Role & Access Revocation Listener
  const prevRoleRef = useRef(userRole);
  useEffect(() => { prevRoleRef.current = userRole; }, [userRole]);

  useEffect(() => {
    if (!currentUser) return;
    
    const email = currentUser.email.toLowerCase();
    const unsubUserDoc = onSnapshot(
      doc(db, 'allowed_users', email),
      (snap) => {
        if (!snap.exists()) {
          // Document deleted -> access revoked
          showMessage('Your access has been revoked by an administrator.', 'error');
          signOut(auth);
          return;
        }
        
        const data = snap.data();
        
        // Check disabled status (soft ban)
        if (data.status === 'disabled') {
          showMessage('Your account has been disabled by an administrator.', 'error');
          signOut(auth);
          return;
        }
        
        // Check force logout
        if (data.forceLogoutAt) {
          const forceTime = data.forceLogoutAt.toDate().getTime();
          // If forceLogoutAt is newer than when this session started, log them out
          if (forceTime > sessionStartTime.current) {
            showMessage('Your session was terminated by an administrator.', 'error');
            signOut(auth);
            return;
          }
        }
        
        // Check role changes
        let newRole = data.role ? data.role.toLowerCase().trim() : null;
        if (email === 'bao.h0146824@gmail.com' || email === 'sunsetmyfav@gmail.com') {
          newRole = 'it';
        }
        
        if (newRole && newRole !== prevRoleRef.current) {
          setUserRole(newRole);
          showMessage(`Your role was updated to ${newRole}`, 'success');
        }
      },
      (error) => {
        console.warn("User doc listener failed:", error.message);
      }
    );
    
    return () => unsubUserDoc();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !userRole) {
      setDynamicOverrides({});
      return;
    }

    // Students don't need dynamic permission overrides — skip the listener
    // to avoid an unnecessary Firestore WebChannel that may get cancelled
    if (userRole === 'student') {
      setDynamicOverrides({});
      return;
    }

    // 2. Real-time Permissions overrides listener
    const unsubscribeOverrides = onSnapshot(
      doc(db, 'system_settings', 'role_permissions'), 
      (snap) => {
        if (snap.exists()) {
          setDynamicOverrides(snap.data());
        }
      },
      (error) => {
        console.warn("Role permissions override check bypassed (insufficient privileges or document missing):", error.message);
      }
    );

    return () => {
      unsubscribeOverrides();
    };
  }, [currentUser, userRole]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubGcal = onSnapshot(doc(db, 'gcal_tokens', currentUser.uid), (docSnap) => {
      if (docSnap.exists() && docSnap.data().refresh_token) {
        setIsGcalConnected(true);
      } else {
        setIsGcalConnected(false);
      }
    }, (error) => {
      console.warn("Google Calendar listener permission denied or failed:", error.message);
      setIsGcalConnected(false);
    });
    return unsubGcal;
  }, [currentUser]);

  useEffect(() => {
    // 3. Deep Link Listener for Native Google Login
    let unsubTauri = null;
    let capListener = null;

    const handleDeepLink = async (url) => {
      if (!url) return;
      try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'auth' || urlObj.pathname.includes('auth')) {
          const token = urlObj.searchParams.get('token');
          if (token) {
            await signInWithCustomToken(auth, token);
          }
        }
      } catch (e) {
        console.error("Failed to parse deep link:", e);
      }
    };

    if (isTauri()) {
      import('@tauri-apps/plugin-deep-link').then(({ onOpenUrl }) => {
        onOpenUrl(async (urls) => {
          for (const url of urls) {
            await handleDeepLink(url);
          }
        }).then(unsub => unsubTauri = unsub);
      }).catch(e => console.error("Failed to import tauri deep link plugin", e));
      
      // Also check if we were redirected back directly in the same window
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        // Clear it from the URL so we don't re-authenticate on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        signInWithCustomToken(auth, token).catch(console.error);
      }
    } else if (isCapacitor()) {
      import('@capacitor/app').then(({ App }) => {
        capListener = App.addListener('appUrlOpen', (data) => {
          handleDeepLink(data.url);
        });
      }).catch(e => console.error("Failed to import capacitor app plugin", e));
    }

    return () => {
      if (unsubTauri) unsubTauri();
      if (capListener && capListener.remove) capListener.remove();
    };
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const signup = (email, password) => createUserWithEmailAndPassword(auth, email, password);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);
  
  const loginWithGoogle = async () => {
    if (isNative()) {
      // Native flow
      const sessionId = crypto.randomUUID();
      return new Promise(async (resolve, reject) => {
        const unsub = onSnapshot(doc(db, 'auth_sessions', sessionId), async (docSnap) => {
          if (docSnap.exists() && docSnap.data().token) {
            unsub();
            try {
              const result = await signInWithCustomToken(auth, docSnap.data().token);
              // Clean up the session document (fire and forget to avoid permission sync errors)
              deleteDoc(doc(db, 'auth_sessions', sessionId)).catch(e => console.warn('Cleanup skipped:', e));
              resolve(result);
            } catch (err) {
              reject(err);
            }
          }
        }, (err) => {
          unsub();
          reject(err);
        });
        
        try {
          await openNativeGoogleAuth(sessionId);
        } catch (err) {
          unsub();
          reject(err);
        }
      });
    }
    const result = await signInWithPopup(auth, provider);
    return result;
  };

  const connectGoogleCalendar = () => {
    if (!currentUser) return;
    openGCalAuth(currentUser.uid);
  };

  const disconnectGoogleCalendar = async () => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'gcal_tokens', currentUser.uid));
    } catch (e) {
      console.error("Failed to disconnect calendar:", e);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  // RBAC Helper functions
  const can = (action) => {
    const role = userRole || 'student';
    const overrideKey = `${action}_${role}`;
    if (dynamicOverrides[overrideKey] !== undefined) {
      return dynamicOverrides[overrideKey];
    }
    const rolePerm = STATIC_PERMISSIONS[role];
    return rolePerm ? (rolePerm[action] === true) : false;
  };

  const canEditSchedule = (schedule) => {
    if (!currentUser) return false;
    const role = userRole || 'student';
    if (role === 'it' || role === 'academic_coordinator' || role === 'senior_teacher') return true;
    if (role === 'teacher') return schedule.userEmail?.toLowerCase() === currentUser.email.toLowerCase() || schedule.classId;
    return dynamicOverrides[`edit_schedule_${role}`] === true;
  };

  const canDeleteSchedule = (schedule) => {
    if (!currentUser) return false;
    const role = userRole || 'student';
    if (role === 'it' || role === 'academic_coordinator' || role === 'senior_teacher') return true;
    if (role === 'teacher') return schedule.userEmail?.toLowerCase() === currentUser.email.toLowerCase();
    return dynamicOverrides[`delete_schedule_${role}`] === true;
  };

  const value = {
    currentUser,
    userRole,
    userUsername,
    userDisplayName,
    setUserUsername,
    setUserDisplayName,
    login,
    signup,
    loginWithGoogle,
    logout,
    can,
    canEditSchedule,
    canDeleteSchedule,
    isGcalConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
