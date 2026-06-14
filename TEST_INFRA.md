# E2E Test Infrastructure & Feature Coverage Plan

This document outlines the test architecture and feature coverage plan for the mobile UI redesign and Google login fix in **Schedule Manager Native**.

## Test Architecture Overview

Because this project runs in a native/mobile wrapper (iOS WKWebView / Tauri / Capacitor), traditional browser-based E2E test suites (like Cypress or Playwright) can be heavy and require complex environment setup. 

To achieve instant, reliable, and deterministic verification of interface contracts, code structures, layout, CSS variables, and permission restrictions, we implement a **programmatic static & semantic parsing suite** in Node.js (`verify-features.js`). 

The suite parses the source code files (`src/pages/Login.jsx`, `src/pages/MobileDashboard.jsx`, and `src/styles.css`) to inspect the DOM structure, attribute bindings, style rules, active state class usage, and role permissions.

## 4-Tier Testing Methodology

The suite covers **38 distinct test cases** grouped into four tiers:

### Tier 1: Feature Coverage (15 Test Cases)
Verifies the existence and properties of basic elements required by the specification.
1. **Google Login Link Element**: Verifies if Google login uses a standard `<a>` tag or `<motion.a>` rather than a button.
2. **Google Login Redirect URI**: Verifies if the Google login link redirects to `/api/native-google-auth`.
3. **Google Login Target**: Verifies that the Google login link has `target="_blank"`.
4. **Google Login Rel Attribute**: Verifies that the Google login link has `rel="noopener noreferrer"`.
5. **Mobile Navigation Container**: Verifies the presence of the bottom tab bar container (`m-tab-bar`).
6. **Mobile Navigation Tab Items**: Verifies the presence of 4 distinct tab buttons (Home, Events, Calendar, Profile).
7. **Mobile Navigation Active Highlight**: Verifies that active tabs receive the `active` class or active-highlight styling indicator.
8. **Liquid Glass Nav Layout Structure**: Verifies if the active class uses specific CSS properties or indicator bubbles (`::before` dot).
9. **Integrated "+" Button (FAB)**: Checks if the "+" action button is integrated into the bottom tab layout structure.
10. **FAB Visual Hierarchy & Positioning**: Verifies the positioning of the floating action button (`m-fab`).
11. **Textless Buttons Accessibility**: Verifies that any textless buttons (e.g. FAB, X buttons, navigation icons) have descriptive `aria-label` attributes.
12. **Login Screen Container**: Verifies the presence of the `#loginScreen` or similar container with high-priority CSS styles.
13. **Brand Logo Asset**: Verifies that the brand logo image source and visual container exist.
14. **Form Submit Buttons**: Verifies the presence of form submit buttons (Sign In / Create Account) and reset buttons.
15. **Divider Visual**: Verifies the presence of the `login-divider` visual element.

### Tier 2: Boundary & Edge Cases (15 Test Cases)
Verifies extreme inputs, empty states, CSS limitations, and permissions boundary behavior.
16. **Google Login Instant Click Disable**: Verifies that the Google login link incorporates a state variable or callback to instantly disable further clicks.
17. **Empty State - Task List**: Checks if the student task list displays a friendly empty state message when empty.
18. **Empty State - Latest Feedback**: Checks if the feedback widget displays a friendly message when no feedback exists.
19. **Empty State - Event List**: Checks if the event list displays an empty state container (`m-empty-state`) when no events match the filter.
20. **Admin Console Restriction**: Verifies that only users with the `view_console` permission can access the Admin Console link.
21. **Create Schedule Permission**: Verifies that the FAB/plus button is conditionally rendered based on the `create_schedule` permission.
22. **Edit Schedule Permission**: Verifies that schedule action controls (Start, Complete, Cancel) are conditional on the `canEditSchedule` permission.
23. **Delete Schedule Permission**: Verifies that the Delete action control is conditional on the `canDeleteSchedule` permission.
24. **Touch-Action Setting**: Verifies that mobile buttons, anchors, and inputs have `touch-action: manipulation` or `touch-action: none` to disable the 300ms double-tap delay.
25. **Liquid Glass Blur Styles**: Verifies that `backdrop-filter: blur(...)` and `-webkit-backdrop-filter` are defined in `styles.css`.
26. **Glassmorphism Transparency (Opacity)**: Verifies that custom glassmorphic background styles utilize alpha channels (`rgba` or `hsla`).
27. **Z-Index Boundary Hierarchy**: Verifies that the bottom sheet overlay has a higher z-index than the bottom tab bar.
28. **Safe Area Inset Padding**: Verifies that the tab bar incorporates `env(safe-area-inset-bottom)` to prevent cutoff on notch devices.
29. **Form Input Required Attributes**: Verifies that critical form inputs (Email, Password) enforce HTML5 `required` constraints.
30. **Skeleton Loading Layout**: Verifies that the loading state renders skeleton placeholders with corresponding CSS skeleton animation classes.

### Tier 3: Cross-Feature Combinations (3 Test Cases)
Verifies scenarios where multiple features interact.
31. **Fluid Responsive Height (dvh)**: Verifies that both the main mobile container (`m-container`) and the login screen use dynamic viewport height (`100dvh`) to prevent layout shift with the mobile keyboard.
32. **Permission-Driven Nav Layout Variation**: Verifies how the presence of the FAB changes or behaves relative to tab bar spacing (ensuring FAB is offset so it does not block navigation).
33. **Auth State Form Toggling**: Verifies that the sign-in/sign-up state toggle updates button texts, onSubmit callbacks, and conditionally shows/hides the password reset button.

### Tier 4: Real-World Scenarios (5 Test Cases)
Verifies complex user flows and layouts.
34. **Simulated Student Workflow**: Verifies that a Student user sees the tasks and feedback widgets but does NOT see the FAB or Admin Console.
35. **Simulated Admin/Teacher Workflow**: Verifies that an Admin/Teacher user sees the FAB and Admin Console links but does NOT see the Student tasks/feedback widgets.
36. **Simulated Google Login Click Lockout**: Simulates the state transition from idle to authentication redirect, ensuring the click handler locks future interactions.
37. **Mobile Hardware Acceleration Styles**: Verifies that mobile transition classes incorporate `will-change: transform` or `transform: translateZ(0)` to trigger GPU rendering.
38. **Reset Password Flow Interaction**: Verifies that clicking the password reset button triggers a confirmation link email notification behavior and toggles error/success states.

---

## Test Execution Details

The verification script can be run using:
```bash
node verify-features.js
```
The results will display a complete breakdown of passing and failing assertions across all 4 tiers, pointing to specific line numbers and code snippets.
