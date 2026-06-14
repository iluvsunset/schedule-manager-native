# Handoff Report — Product Owner Requirements & UX Specification

## 1. Observation
The following file segments were analyzed to define requirements and layout structure:

1. **Google Login Button** in `src/pages/Login.jsx` (Lines 139-142):
   ```jsx
   <motion.button onClick={handleGoogleSignIn} className="btn-google" variants={itemVariants}>
     <svg width="18" height="18" viewBox="0 0 18 18">...</svg>
     Google
   </motion.button>
   ```
   *Currently utilizes an asynchronous button event handler (`onClick`) which is subject to iOS WKWebView popup-blocker restrictions.*

2. **Mobile Bottom Navigation Bar** in `src/pages/MobileDashboard.jsx` (Lines 723-741):
   ```jsx
   <nav className="m-tab-bar">
     {[
       { key: 'home', label: 'Home', Icon: Home },
       { key: 'events', label: 'Events', Icon: List },
       { key: 'calendar', label: 'Calendar', Icon: Calendar },
       { key: 'profile', label: 'Profile', Icon: User },
     ].map(({ key, label, Icon }) => (
       <button
         key={key}
         type="button"
         className={`m-tab ${currentTab === key ? 'active' : ''}`}
         onPointerDown={() => setCurrentTab(key)}
         onClick={() => setCurrentTab(key)}
       >
         <Icon size={24} className="m-tab-icon" />
         <span>{label}</span>
       </button>
     ))}
   </nav>
   ```
   *Features standard buttons with `<span>` text labels and an active dot style on `.active`.*

3. **Standalone Floating Action Button (FAB)** in `src/pages/MobileDashboard.jsx` (Lines 710-721):
   ```jsx
   {/* ─── FAB ─── */}
   {can('create_schedule') && (
     <button
       type="button"
       className="m-fab"
       onPointerDown={() => setShowCreate(true)}
       onClick={() => setShowCreate(true)}
       aria-label="Create Event"
     >
       <Plus size={24} className="m-fab-icon" />
     </button>
   )}
   ```
   *Renders independently outside the bottom tab bar navigation context.*

4. **Tab Bar CSS** in `src/styles.css` (Lines 2334-2349):
   ```css
   .m-tab-bar {
     position: fixed;
     bottom: 0;
     left: 0;
     right: 0;
     display: flex;
     justify-content: space-around;
     background: rgba(4, 4, 6, 0.95);
     backdrop-filter: blur(30px);
     -webkit-backdrop-filter: blur(30px);
     border-top: 1px solid var(--border-default);
     padding: 6px 0;
     padding-bottom: calc(env(safe-area-inset-bottom, 8px) + 6px);
     z-index: 200;
     box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.5);
   }
   ```
   *Renders flat across the bottom of the viewport.*

---

## 2. Logic Chain
1. **Bypassing the WKWebView Popup Blocker**:
   - To bypass the iOS WKWebView popup blocker, the window/browser redirection must occur synchronously on click.
   - HTML standard `<a>` tags with `target="_blank"` are handled natively and synchronously by iOS WKWebView without being flagged as programmatic popups.
   - Therefore, changing the Google login button from `<button>` to a native `<a>` tag pointing directly to the final server URL allows native popups to open reliably.
   - Generating a `sessionId` on mount rather than on-click ensures that the absolute URL with query parameters is ready immediately when clicked.

2. **Liquid Glass & Center FAB Redesign**:
   - Removing `<span>` labels simplifies the DOM and aligns layout focus strictly on tab icons.
   - Changing `.m-tab-bar` layout constraints (`left: 50%`, `transform: translateX(-50%)`, `width: calc(100% - 32px)`, `max-width: 450px`, and a floating `bottom` offset) converts the flat anchored bar into a floating pill shape.
   - Utilizing a `::after` pseudo-element on the `.active` tab button achieves the visual glass highlight behind the SVG icon entirely in CSS without polluting the JSX code structure.
   - Relocating the `+` FAB into the center of the `.m-tab-bar` list array simplifies positioning and lets the items naturally space themselves inside the flex container.

---

## 3. Caveats
- No code was modified in the codebase repository (this subagent is strictly read-only per Teamwork explorer constraints). The implementation of this spec must be carried out by a Developer subagent.
- The Vercel deployment backend must already be running the corresponding `/api/native-google-auth` endpoint and handling custom-token generation on `auth_sessions/{sessionId}`.

---

## 4. Conclusion
We have generated a detailed requirements and UX design specification (`po_spec.md`) that explicitly defines:
1. The structural change from `<button>` to `<a>` with `target="_blank"` and pointer-events state-control to block double clicks for Google auth.
2. The CSS modifications to `.m-tab-bar`, `.m-tab`, `.m-tab-fab`, and active glowing indicators to create the floating "liquid glass" navigation.
3. The layout adjustment to integrate the `+` FAB directly into the center of the navigation bar.

---

## 5. Verification Method
- **Verification Resource**: Inspect the written requirements spec at `/Users/iluvsunset/schedule-manager-native/.agents/po_requirements/po_spec.md`.
- **Manual Verification**: After the Developer role implements the changes, run `npm run dev` and test on mobile views. The navigation bar must float as a translucent pill and the Google Auth must open in a new tab synchronously without being blocked.
