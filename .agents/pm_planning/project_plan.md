# Project Plan & Roadmap: Mobile UI Redesign and Login Fix

## 1. Executive Summary
This project aims to deliver a modern, liquid glassmorphic bottom navigation bar with an integrated Floating Action Button (FAB) for the mobile web client, and resolve critical Google Sign-In issues on iOS WKWebView by switching from an asynchronous API call to a synchronous, native HTML link redirection.

---

## 2. Technical Stack & Repository Analysis
Based on the file inspection:
- **Build Setup**:
  - The project root contains a React 19 application built via Vite (`vite.config.js`).
  - Web outputs are built to the `dist/` directory.
  - Capacitor (`capacitor.config.json`) wraps the `dist` directory into an iOS app using WKWebView.
  - An Express backend (`server.js` and serverless handlers in `api/`) supports the frontend, including Google OAuth authentication handlers.
  - An Expo React Native setup exists in the `mobile-app/` subdirectory but is out-of-scope for the core Vite/Capacitor integration task.
- **Test Setup**:
  - Currently, there are no test dependencies (like Jest, Vitest, Playwright, or Cypress) in `package.json`.
  - To support Milestone 2 (M2) E2E testing, a lightweight E2E or unit testing framework must be introduced (e.g., configuring `vitest` or `playwright`).
  - A utility test file `test-firestore.js` exists, which tests basic connection to Firestore via the admin SDK.

---

## 3. Detailed Milestone Breakdown & Roadmap

### Milestone 1: Requirements & Design (PO/PM)
* **Objective**: Define UI/UX specs and plan technical implementation.
* **Dependencies**: None.
* **Tasks**:
  1. PO specifies requirements for Google Sign-In interaction and Glassmorphic Nav/FAB design details (`po_spec.md`).
  2. PM defines project plan, dependencies, and verification strategy (`project_plan.md`).
* **Deliverables**: `po_spec.md`, `project_plan.md`.

### Milestone 2: E2E Test Suite Creation (TEST)
* **Objective**: Build test suites covering current behavior, tab navigation, and authentication flows to verify fixes and regressions.
* **Dependencies**: Milestone 1.
* **Tasks**:
  1. Install test dependencies (e.g., `vitest` or a mock environment for E2E verification).
  2. Create test suites targeting navigation tab states in `MobileDashboard.jsx` and user auth redirect triggers in `Login.jsx`.
* **Deliverables**: Test files (co-located under `src/pages/__tests__/` or a dedicated test folder), updated dependencies.

### Milestone 3: Implement Google Login Fix (DEV)
* **Objective**: Bypass WKWebView popup blockers in native views by using synchronous link redirection.
* **Dependencies**: Milestone 1.
* **Tasks**:
  1. Refactor `Login.jsx` to replace the button-based Google Sign-In trigger with a native `<a>` anchor tag using `target="_blank"`.
  2. Pre-generate or dynamic-generate a `sessionId` before navigation.
  3. Register the Firestore snapshot listener on the pre-generated `sessionId` immediately upon rendering/click.
  4. Implement instant click disabling (adding a class or state that removes `href`/adds `pointer-events: none`) to prevent double-triggers and rate-limit errors.
* **Deliverables**: Updated `src/pages/Login.jsx` and related state handlers.

### Milestone 4: Implement Liquid Glass Navigation & FAB (DEV)
* **Objective**: Create a floating bottom navigation bar that matches modern liquid glass aesthetics and integrates the "+" creation button.
* **Dependencies**: Milestone 1, Milestone 3.
* **Tasks**:
  1. Redesign `MobileDashboard.jsx` navigation bar, converting it from a 4-tab bar to a 5-item bar: `[Home] [Events] [ + Button ] [Calendar] [Profile]`.
  2. Map the middle "+" button to open the event creation sheet (`setShowCreate(true)`) instead of routing to a tab.
  3. Update `src/styles.css` to style the bottom navigation bar `.m-tab-bar` with Apple-style frosted glass (`backdrop-filter`, saturation, transparency, thin borders, border-radius).
  4. Ensure support for iOS safe area padding via `env(safe-area-inset-bottom)` to prevent content overlap with the native home indicator.
* **Deliverables**: Updated `src/pages/MobileDashboard.jsx` and `src/styles.css`.

### Milestone 5: Verification & Adversarial Hardening (TEST/DEV)
* **Objective**: Run automated test suites, verify features on devices/emulators, and perform security and forensic auditing.
* **Dependencies**: Milestones 2, 3, 4.
* **Tasks**:
  1. Run the E2E test suites to verify that both the Google Login redirection and bottom navigation functions behave correctly.
  2. Perform manual verification on simulated mobile viewports.
  3. Conduct forensic verification (e.g., verifying Firestore rules for the `auth_sessions` collection and checking for leaked tokens).
* **Deliverables**: Completed test reports, clean test runs.

---

## 4. Key Constraints & Interface Contracts
1. **Google Login Anchor**:
   - Endpoint: `/api/native-google-auth`
   - Trigger: `<a href="/api/native-google-auth?sessionId=..." target="_blank">`
   - Visual: must style like a button, disable immediately on click.
2. **Bottom Navigation & FAB Layout**:
   - Placement: Bottom-center overlay, floating pill shape.
   - Glassmorphic look: `background: rgba(28, 28, 30, 0.65)`, `backdrop-filter: blur(40px) saturate(180%)`, border `0.5px solid rgba(255, 255, 255, 0.1)`.
   - Layout: 5 items horizontally centered.
3. **Safe Area Inset**:
   - Must use CSS: `padding-bottom: calc(env(safe-area-inset-bottom, 8px) + 6px)` or similar.

---

## 5. Potential Risks & Mitigation Strategies

| Risk | Description | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| **WKWebView Popup Blocker** | Even with `<a>` tag, iOS may block `window.open` or link navigation if triggered by non-user events or deep async logic. | High | Ensure that the link has a direct, static/pre-calculated `href` and the browser processes it synchronously during the natural bubble of the `click` event. |
| **Firestore Async Latency** | The redirect login flow depends on Firestore listener to retrieve the custom token. High latency might result in a delayed login experience. | Medium | Show a clear, glassmorphic loading spinner in the app once the user returns from the browser window while listening for the `auth_sessions` snapshot. |
| **Safe Area Overlay** | The bottom pill may collide with the iOS home indicator bar on modern iPhones. | Low-Medium | Carefully apply `env(safe-area-inset-bottom)` to dynamically shift the bar upward, leaving a comfortable padding. |
| **Firestore Security Rules** | The `auth_sessions` collection holds custom tokens. If not protected, anyone could read/write tokens. | Critical | Verify that the Firebase rules in `firestore.rules` restrict read/write access to the specific session documents (e.g., restrict write to Server Admin only, allow read only to matching client session IDs). |

---

## 6. Verification Strategy
The verification process will follow a tiered structure:
1. **Developer Self-Verification**: Run `npm run build` to verify there are no compilation or syntax errors.
2. **Test Automation**: Execute the test runner (e.g., `npm run test` or `vitest` command once added in M2) to confirm no breakage of React rendering or redirection logic.
3. **Forensic Integrity Check**:
   - Verify that the temporary HTML email reporting files (if any) are deleted.
   - Confirm that Firestore cleanup logic correctly removes session tokens from the `auth_sessions` collection once the client successfully logs in.
