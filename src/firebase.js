import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager,
  enableNetwork,
  disableNetwork
} from "firebase/firestore";
import { initializeAuth, getAuth, browserLocalPersistence, GoogleAuthProvider } from "firebase/auth";
import { isNative, getPlatformName } from "./platform";

const firebaseConfig = {
  apiKey: "AIzaSyD0Prdhbx4CwV5Ms3K65fwBKfljUtpEr0I",
  authDomain: "sunsetmyfav.firebaseapp.com",
  projectId: "sunsetmyfav",
  storageBucket: "sunsetmyfav.firebasestorage.app",
  messagingSenderId: "429949738650",
  appId: "1:429949738650:web:9df4e79a2e6a71d2bbc923"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  db = getFirestore(app);
}

let auth;
try {
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence
  });
} catch (e) {
  auth = getAuth(app);
}
const provider = new GoogleAuthProvider();

/**
 * SyncManager: Handles reconnection and sync status
 * In native apps (Tauri/Capacitor), the WebView may be suspended
 * and resumed. When it resumes, we force Firebase to reconnect
 * so it flushes any pending offline writes immediately.
 */
class SyncManager {
  constructor() {
    this._listeners = [];
    this._isOnline = navigator.onLine;
    this._platform = getPlatformName();
    this._isResuming = false;

    window.__currentSyncManager = this;
    
    if (!window.__syncManagerInitialized) {
      window.__syncManagerInitialized = true;

      // Listen for online/offline events
      window.addEventListener('online', () => window.__currentSyncManager._handleOnline());
      window.addEventListener('offline', () => window.__currentSyncManager._handleOffline());
      
      // Listen for visibility changes (app comes to foreground)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          window.__currentSyncManager._handleResume();
        }
      });

      // For Capacitor: listen for app resume events
      if (isNative()) {
        this._setupNativeListeners();
      }
    }

    console.log(`[SyncManager] Initialized on platform: ${this._platform}`);
  }

  async _setupNativeListeners() {
    try {
      const { App: CapApp } = await import('@capacitor/app');
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          console.log('[SyncManager] App resumed from background - forcing Firebase reconnect');
          window.__currentSyncManager._handleResume();
        }
      });
    } catch (e) {
      // Not running in Capacitor, skip
    }
  }

  async _handleOnline() {
    console.log('[SyncManager] Network came online - reconnecting Firebase');
    this._isOnline = true;
    try {
      await enableNetwork(db);
      this._notifyListeners('online');
    } catch (e) {
      console.warn('[SyncManager] Failed to enable network:', e.message);
    }
  }

  async _handleOffline() {
    console.log('[SyncManager] Network went offline');
    this._isOnline = false;
    this._notifyListeners('offline');
  }

  async _handleResume() {
    if (this._isResuming) return;
    this._isResuming = true;
    try {
      console.log('[SyncManager] App resumed - checking sync status');
      if (navigator.onLine) {
        try {
          // Cycle the network connection to force a fresh sync
          await disableNetwork(db);
          await enableNetwork(db);
          console.log('[SyncManager] Firebase network cycled - pending writes will flush');
          this._notifyListeners('synced');
        } catch (e) {
          console.warn('[SyncManager] Resume sync failed:', e.message);
        }
      }
    } finally {
      this._isResuming = false;
    }
  }

  /**
   * Register a listener for sync events
   * @param {Function} callback - Called with event type: 'online', 'offline', 'synced'
   * @returns {Function} Unsubscribe function
   */
  onSyncEvent(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(l => l !== callback);
    };
  }

  _notifyListeners(event) {
    this._listeners.forEach(l => l(event));
  }

  get isOnline() {
    return this._isOnline;
  }
}

// Create singleton sync manager
const syncManager = new SyncManager();

export { app, db, auth, provider, syncManager };
