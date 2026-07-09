/**
 * Platform Detection Utility
 * Detects whether the app is running as:
 * - Capacitor iOS native app
 * - Tauri Mac desktop app  
 * - Standard web browser
 */

export function isCapacitor() {
  return typeof window !== 'undefined' && window.Capacitor !== undefined;
}

export function isTauri() {
  return typeof window !== 'undefined' && (window.__TAURI__ !== undefined || window.__TAURI_INTERNALS__ !== undefined);
}

export function isIos() {
  return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isDesktopTauri() {
  return isTauri() && !isIos();
}

export function isNative() {
  return isCapacitor() || isTauri();
}

export function isBrowser() {
  return !isNative();
}

export function getWebDomain() {
  return 'https://schedule-iluvsunset.vercel.app';
}

/**
 * Returns the current platform name for logging
 */
export function getPlatformName() {
  if (isCapacitor()) return 'ios-capacitor';
  if (isTauri()) return 'mac-tauri';
  return 'web-browser';
}

/**
 * Returns the base API URL to use for all backend requests.
 * In a web browser, it's relative (''). In native apps, it requires the full Vercel URL.
 */
export function getApiBase() {
  if (isNative()) {
    // Forcing production backend for dev mode because Google OAuth strictly blocks http://192.168.x.x redirect URIs on physical devices
    return 'https://schedule-iluvsunset.vercel.app';
  }
  return '';
}

/**
 * Handles platform-specific Google Calendar auth
 * On native apps, we can't redirect to /api/gcal-auth because
 * the app runs from a local file system, not a web server.
 * Instead, we open the auth URL in the system browser.
 */
export async function openGCalAuth(uid) {
  const apiBase = getApiBase();

  if (isDesktopTauri()) {
    // Tauri Desktop: use the Tauri shell open command to open in default browser
    const isDev = import.meta.env.DEV;
    const queryParams = `uid=${uid}&native=true${isDev ? '&dev=true' : ''}`;

    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(`${apiBase}/api/gcal-auth?${queryParams}`);
    } catch (e) {
      if (window.__TAURI__ && window.__TAURI__.invoke) {
        window.__TAURI__.invoke('plugin:opener|open_url', { url: `${apiBase}/api/gcal-auth?${queryParams}` });
      } else {
        window.open(`${apiBase}/api/gcal-auth?${queryParams}`, '_blank');
      }
    }
  } else if (isCapacitor()) {
    // Capacitor: open in the system browser using Capacitor Browser plugin
    const isDev = import.meta.env.DEV;
    const queryParams = `uid=${uid}&native=true${isDev ? '&dev=true' : ''}`;
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: `${apiBase}/api/gcal-auth?${queryParams}` });
    } catch (e) {
      // Fallback
      window.open(`${apiBase}/api/gcal-auth?${queryParams}`, '_blank');
    }
  } else if (isIos()) {
    // iOS Tauri: Synchronous window.open bypasses popup blocker
    const isDev = import.meta.env.DEV;
    const queryParams = `uid=${uid}&native=true${isDev ? '&dev=true' : ''}`;
    window.open(`${apiBase}/api/gcal-auth?${queryParams}`, '_blank');
  } else {
    // Web: standard redirect
    window.location.href = `/api/gcal-auth?uid=${uid}`;
  }
}

export async function openNativeGoogleAuth(sessionId) {
  const apiBase = getApiBase();

  if (isDesktopTauri()) {
    const isDev = import.meta.env.DEV;
    const queryParams = `?sessionId=${sessionId}${isDev ? '&dev=true' : ''}`;
    try {
      console.log("Attempting to open system browser for Google Login...");
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(`${apiBase}/api/native-google-auth${queryParams}`);
      console.log("System browser opened successfully.");
    } catch (e) {
      console.error("Failed to open via plugin-shell, falling back to window.open:", e);
      window.open(`${apiBase}/api/native-google-auth${queryParams}`, '_blank');
    }
  } else if (isCapacitor()) {
    const isDev = import.meta.env.DEV;
    const queryParams = `?sessionId=${sessionId}${isDev ? '&dev=true' : ''}`;
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: `${apiBase}/api/native-google-auth${queryParams}` });
    } catch (e) {
      window.open(`${apiBase}/api/native-google-auth${queryParams}`, '_blank');
    }
  } else if (isIos()) {
    // iOS Tauri: Synchronous window.open bypasses popup blocker
    const isDev = import.meta.env.DEV;
    const queryParams = `?sessionId=${sessionId}${isDev ? '&dev=true' : ''}`;
    window.open(`${apiBase}/api/native-google-auth${queryParams}`, '_blank');
  } else {
    window.location.href = `/api/native-google-auth?sessionId=${sessionId}`;
  }
}

export async function openExternalUrl(url) {
  if (isDesktopTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch (e) {
      if (window.__TAURI__ && window.__TAURI__.invoke) {
        window.__TAURI__.invoke('plugin:opener|open_url', { url });
      } else {
        window.open(url, '_blank');
      }
    }
  } else if (isCapacitor()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
    } catch (e) {
      window.open(url, '_blank');
    }
  } else {
    window.open(url, '_blank');
  }
}

/**
 * Request notification permissions locally on the platform
 */
export async function requestLocalNotificationPermission() {
  if (isTauri()) {
    try {
      const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
      let allowed = await isPermissionGranted();
      if (!allowed) {
        const permission = await requestPermission();
        allowed = (permission === 'granted');
      }
      return allowed;
    } catch (e) {
      console.error("Failed to request local notification permission via Tauri:", e);
      return false;
    }
  } else {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  }
  return false;
}

/**
 * Triggers a platform-native notification banner locally
 */
export async function triggerLocalNotification(title, body) {
  if (isTauri()) {
    try {
      const { sendNotification } = await import('@tauri-apps/plugin-notification');
      sendNotification({ title, body });
    } catch (e) {
      console.error("Failed to trigger local notification via Tauri:", e);
    }
  } else {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }
}

