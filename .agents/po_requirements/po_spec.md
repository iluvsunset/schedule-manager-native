# Product Owner Requirements & UX Design Specification

**Document Version**: 1.0.0  
**Target Milestone**: Mobile Navigation Redesign & Google Sign-In WKWebView Bypass  
**Owner**: Product Owner (PO)  
**Status**: Approved / Ready for Implementation  

---

## 1. Executive Summary

This specification addresses two key mobile-focused improvements for the Chronos application:
1. **Google Login WKWebView Bypass**: Replacing the current asynchronous, promise-based Google Sign-In popup trigger with a synchronous, native HTML anchor (`<a>`) tag. This prevents iOS WKWebView from blocking the auth popup and ensures high reliability on native mobile wrappings (Capacitor/Tauri).
2. **Liquid Glass Bottom Navigation & Center FAB**: Redesigning the mobile bottom navigation bar into a modern, floating, translucent "liquid glass" pill shape featuring icon-only tabs, a glowing active indicator behind the active tab icon, and an integrated "+" Floating Action Button in the center (completely replacing the standalone floating button).

---

## 2. Feature 1: Google Login Fix (WKWebView Popup Bypass)

### 2.1 User Story & Problem Context
* **As a** mobile user running the Chronos application on an iOS device (via Capacitor or a native WebView),
* **I want to** click "Sign in with Google" and have the login screen open immediately in the system browser,
* **So that** the iOS WKWebView popup blocker does not block my authentication attempt.

**Currently**: Clicking the Google button triggers an asynchronous Firestore transaction to create a session document, followed by opening the URL. Because the window opening happens inside a promise resolution (asynchronous callback), WKWebView flag-flags it as a popup and silently blocks it.

---

### 2.2 Functional Requirements

#### R1.1 Native Anchor Tag Implementation
* The "Sign in with Google" button in `src/pages/Login.jsx` MUST be modified from a `<motion.button>` or `<button>` element to a **native HTML `<a>` tag**.
* The `target` attribute on this `<a>` tag MUST be strictly set to `_blank`.
* The `rel` attribute SHOULD be set to `noopener noreferrer` for security.

#### R1.2 Session URL and Endpoint Target
* The `href` attribute on the `<a>` tag MUST point to the endpoint `/api/native-google-auth`.
* It MUST include a dynamically generated query parameter `sessionId` to bind the auth session.
* Under native execution contexts, the URL must resolve to the absolute API base path (e.g. Vercel URL), which is retrieved from `getApiBase()` in `src/platform.js`.
* Target URL format:
  ```
  [API_BASE]/api/native-google-auth?sessionId=[SESSION_ID]&dev=[IS_DEV]
  ```
  *(Example: `https://schedule-iluvsunset.vercel.app/api/native-google-auth?sessionId=f47ac10b-58cc-4372-a567-0e02b2c3d479`)*

#### R1.3 Instant Click Disabling & Prevention of Double-Firing
* When clicked, the link must **instantly** disable further click interactions to prevent double-firing and session overlap.
* **Mechanism**:
  1. A component state variable (e.g., `googleClicked`, default `false`) is set to `true` on the click handler.
  2. If `googleClicked` is true:
     - The `href` attribute is removed or set to `undefined` (or the click event's default action is cancelled via `e.preventDefault()`).
     - CSS styles are applied to disable all pointer events (`pointer-events: none`).
  3. Visual feedback: The element's opacity must drop to `0.5` and the cursor must change to `default`.
  4. In the event of a login failure, the state should reset (`googleClicked = false`), and a new `sessionId` must be generated.

---

### 2.3 Visual & Interaction Rules (CSS)
Add the following selector rules or equivalent Tailwind/inline styles to the Google button:

| State | CSS Attributes | Transition / Animation |
|---|---|---|
| **Default** | `cursor: pointer; opacity: 1; pointer-events: auto;` | `transition: all 0.2s ease;` |
| **Clicked / Disabled** | `cursor: default; opacity: 0.5; pointer-events: none;` | Instant transition on click |

---

### 2.4 Code Design Sketch (For Developer Reference)

**Before (in `src/pages/Login.jsx`):**
```jsx
<motion.button onClick={handleGoogleSignIn} className="btn-google" variants={itemVariants}>
  <svg>...</svg>
  Google
</motion.button>
```

**Proposed After (in `src/pages/Login.jsx`):**
```jsx
// 1. Pre-generate sessionId on mount / reset
const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
const [googleClicked, setGoogleClicked] = useState(false);

const apiBase = getApiBase(); // Imported from ../platform
const googleAuthUrl = `${apiBase}/api/native-google-auth?sessionId=${sessionId}${import.meta.env.DEV ? '&dev=true' : ''}`;

const handleGoogleClick = (e) => {
  if (googleClicked) {
    e.preventDefault();
    return;
  }
  setGoogleClicked(true);
  
  // 2. Start the Firestore listener for the session token in AuthContext
  // The loginWithGoogleNative(sessionId) method should start the listener
  loginWithGoogleNative(sessionId)
    .then((result) => {
      // User is successfully signed in
    })
    .catch((err) => {
      setError(err.message);
      setGoogleClicked(false);
      setSessionId(crypto.randomUUID()); // Reset for retry
    });
};

// 3. JSX Render
<a 
  href={googleClicked ? undefined : googleAuthUrl}
  target="_blank"
  rel="noopener noreferrer"
  onClick={handleGoogleClick}
  className={`btn-google ${googleClicked ? 'disabled' : ''}`}
  style={{
    pointerEvents: googleClicked ? 'none' : 'auto',
    opacity: googleClicked ? 0.5 : 1,
    cursor: googleClicked ? 'default' : 'pointer'
  }}
>
  <svg>...</svg>
  Google
</a>
```

---

## 3. Feature 2: Liquid Glass Navigation Bar & Integrated FAB

### 3.1 UX Design Philosophy
* **translucent floating pill**: Rather than anchored flat at the bottom, the bar floats above the content with rounded edges, replicating high-end iOS system components.
* **Focus on Iconography**: Clean, textless tab buttons. Text labels are removed to save vertical space and provide a minimal aesthetic.
* **Integrated Action**: The "+" (Add Schedule) action becomes a first-class citizen inside the navigation bar instead of a distracting floating overlay.

---

### 3.2 Layout Structure & Hierarchy

The navigation bar container MUST be a `<nav>` element. The layout structure shifts dynamically based on user role permissions:

#### Case A: User has Create Schedule Permission (`can('create_schedule')` is true)
Render a **5-column** horizontal layout:
1. **Home Tab** (Icon only: `Home`)
2. **Events Tab** (Icon only: `List`)
3. **Add Button (Center FAB)** (Icon only: `Plus`)
4. **Calendar Tab** (Icon only: `Calendar`)
5. **Profile Tab** (Icon only: `User`)

#### Case B: User DOES NOT have Create Schedule Permission (`can('create_schedule')` is false)
Render a **4-column** horizontal layout:
1. **Home Tab** (Icon only: `Home`)
2. **Events Tab** (Icon only: `List`)
3. **Calendar Tab** (Icon only: `Calendar`)
4. **Profile Tab** (Icon only: `User`)

*Note: The tabs must expand proportionally to fill the bar space in both cases.*

---

### 3.3 CSS Selectors & Visual Style Rules

#### R2.1 Floating Glassmorphism Bar Container (`.m-tab-bar`)
The bar must be updated with the following specific style rules:
* **Positioning**:
  - `position: fixed`
  - `bottom: calc(env(safe-area-inset-bottom, 8px) + 12px);` (Floats above the bottom edge)
  - `left: 50%;`
  - `transform: translateX(-50%);` (Centered horizontally)
  - `width: calc(100% - 32px);` (16px margin on each side)
  - `max-width: 450px;` (Ensure it doesn't stretch too wide on larger screens)
* **Aesthetics**:
  - `height: 64px;`
  - `border-radius: 32px;` (Full rounded pill shape)
  - `background: rgba(10, 10, 12, 0.75);` (Dark, translucent background)
  - `backdrop-filter: blur(20px) saturate(180%);`
  - `-webkit-backdrop-filter: blur(20px) saturate(180%);`
  - `border: 1px solid rgba(255, 255, 255, 0.08);` (Subtle boundary line)
  - `box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);` (Deep elevation shadow & internal bezel highlight)
  - `z-index: 200;`
  - `padding: 0 12px;`
  - `display: flex; align-items: center; justify-content: space-between;`

#### R2.2 Tab Button Items (`.m-tab`)
* **Layout**:
  - Remove text label elements (`<span>` inside the tabs).
  - Center the icon horizontally and vertically within the tab button.
  - Height of tab button: `48px`. Width: `48px` (or flex-grow to space evenly).
* **Color States**:
  - **Inactive**: `color: rgba(255, 255, 255, 0.35);` (Soft, muted white)
  - **Active**: `color: #ffffff;` (Pure bright white)
  - **Transition**: `transition: color 0.2s ease, transform 0.2s ease;`

#### R2.3 Active Glowing Highlight (`.m-tab.active::after` / `.m-tab.active::before`)
Instead of the previous dot indicator above the active tab, a subtle glowing white pill must hover behind the active icon.
* **CSS Implementation (using pseudo-elements to avoid DOM noise)**:
  ```css
  .m-tab.active::after {
    content: '';
    position: absolute;
    z-index: -1; /* Place behind the SVG icon */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 32px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.08); /* Translucent white pill */
    border: 1px solid rgba(255, 255, 255, 0.12); /* Hairline boundary */
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.15); /* Soft, radial glow */
    pointer-events: none;
  }
  ```

#### R2.4 Integrated Center FAB (`.m-tab-fab`)
The standalone `.m-fab` button is removed. It is replaced by a centered button inside the tab bar container.
* **Aesthetics**:
  - `width: 48px;`
  - `height: 48px;`
  - `border-radius: 50%;` (Perfect circle)
  - `background: var(--brand-gradient);` (Use the existing premium gradient: iOS Blue to Green)
  - `color: #ffffff;`
  - `border: 1px solid rgba(255, 255, 255, 0.2);`
  - `box-shadow: 0 4px 16px rgba(0, 122, 255, 0.4);`
  - `display: flex; align-items: center; justify-content: center;`
  - `cursor: pointer;`
  - `flex-shrink: 0;`
* **Interaction**:
  - On hover/focus: `filter: brightness(1.1);`
  - On active press (click/tap): `transform: scale(0.9) rotate(90deg); transition: transform 0.15s ease;`

---

## 4. Verification and Acceptance Matrix

Developers and Quality Assurance (TEST) must verify the implementation against this matrix:

| ID | Test Target | Verification Criteria | Status |
|---|---|---|---|
| **V1** | Google Login Tag | Inspect DOM to confirm the Google login button is an `<a>` tag with `target="_blank"`. | [ ] Pending |
| **V2** | Google Login Endpoint | Confirm the `href` attribute dynamically resolves to `${apiBase}/api/native-google-auth?sessionId=...`. | [ ] Pending |
| **V3** | Google Double-Click Protection | Click the Google button once. Verify it instantly gains `pointer-events: none`, opacity drops to `0.5`, and subsequent clicks do not open additional windows. | [ ] Pending |
| **V4** | Nav Bar Layout (Admin/Teacher) | Sign in as an Admin/Teacher. Verify the bottom bar has 5 items (Home, Events, +, Calendar, Profile) in a single floating pill. | [ ] Pending |
| **V5** | Nav Bar Layout (Student) | Sign in as a Student. Verify the bottom bar has 4 items (Home, Events, Calendar, Profile) and the "+" button is completely absent. | [ ] Pending |
| **V6** | Glassmorphism Styles | Verify the bar has `backdrop-filter: blur(20px)` and floating spacing (`bottom: 20px`, rounded corners, not touching screen edges). | [ ] Pending |
| **V7** | Active Glowing Indicator | Check active tabs. Verify the text labels are gone and a soft white glowing pill appears behind the active icon. | [ ] Pending |
