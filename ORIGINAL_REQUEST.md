# Original User Request

## Initial Request — 2026-06-13T19:54:20+02:00

Redesign the mobile bottom navigation bar into a modern "liquid glass" pill shape featuring icon-only tabs, an active highlight, and an integrated "Add Schedule" button in the center. Additionally, fix the Google Sign-In button on iOS WKWebView to successfully open the system browser.

Working directory: /Users/iluvsunset/schedule-manager-native
Integrity mode: demo

## Requirements

### R1. Google Login Fix
Modify the Google Sign-In button in `Login.jsx` to be a native HTML `<a>` tag with `target="_blank"` and a dynamically generated session URL. The button must be instantly disabled upon click to prevent double-firing. This explicitly bypasses the iOS WKWebView asynchronous popup blocker.

### R2. Liquid Glass Navigation Bar
Redesign the bottom navigation in `MobileDashboard.jsx` and `styles.css`. 
- Remove all tab text labels. 
- Style the bar as a floating, translucent pill (glassmorphism) with a heavily blurred dark background. 
- Implement a subtle glowing white pill shape behind the currently active tab icon.

### R3. Integrated Floating Action Button
Remove the current standalone floating "Add Schedule" button. Integrate a "+" button directly into the dead center of the new liquid glass navigation bar.

## Acceptance Criteria

### Google Login Bypass
- [ ] The "Sign in with Google" element is an `<a>` tag with `href` pointing to `/api/native-google-auth`.
- [ ] The `target` attribute is strictly `_blank`.
- [ ] Clicking the link disables the UI element immediately.

### Liquid Glass Navigation
- [ ] The navigation bar is structurally a floating pill shape with `backdrop-filter: blur(...)`.
- [ ] Tab items display only icons, no text.
- [ ] The active tab icon has a white pill-shaped background highlight.
- [ ] The "+" button is perfectly centered within the navigation bar itself, completely replacing the standalone floating action button.

## Verification Resources
The system can be verified manually by running `npm run dev` and viewing the UI at mobile breakpoints to confirm the glassmorphism layout matches the criteria. The Google Login anchor tag can be verified programmatically by parsing the JSX abstract syntax tree or inspecting the rendered DOM.
