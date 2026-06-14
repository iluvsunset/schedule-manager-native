# Project: Schedule Manager Native - Mobile UI Redesign and Login Fix

## Architecture
- **Frontend App**: React application built with Vite and packaged for native/mobile devices (iOS WKWebView / Tauri / Capacitor).
- **Core Pages**:
  - `src/pages/Login.jsx`: Handles user authentication, including Google Login.
  - `src/pages/MobileDashboard.jsx`: The dashboard displayed on mobile devices, containing the bottom navigation bar.
- **Styles**:
  - `src/styles.css`: Styles for components, including layout, theme, and custom designs like glassmorphism.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Requirements & Design (PO/PM) | Gather requirements, define UX behavior, structure milestones, design test architecture. | none | DONE |
| 2 | M2: E2E Test Suite Creation (TEST) | Implement Tier 1-4 opaque-box tests covering login behavior and navigation tabs. | M1 | DONE |
| 3 | M3: Implement Google Login Fix (DEV) | Modify Google Login in `Login.jsx` to use native HTML `<a>` tag with instant click disable. | M1 | DONE |
| 4 | M4: Implement Liquid Glass Nav & FAB (DEV) | Style floating bottom nav bar in `MobileDashboard.jsx` & `styles.css`. Integrate "+" button. | M1, M3 | DONE |
| 5 | M5: Verification & Adversarial Hardening (TEST/DEV) | Run E2E test suites, execute Forensic Audit, perform white-box adversarial coverage checks. | M2, M3, M4 | DONE |

## Interface Contracts
### Google Login Redirection
- **Endpoint**: `/api/native-google-auth`
- **Behavior**: Triggered by user click on `<a>` with `target="_blank"`.
- **UI Interaction**: Immediately disable the clicked button/anchor to avoid double-triggers.

### Mobile Navigation Component
- **Structure**: Bottom navigation container with floating glassmorphic layout.
- **Tab Layout**: `[Tab 1 Icon] [Tab 2 Icon] [ + Button ] [Tab 3 Icon] [Tab 4 Icon]`
- **Active State Class**: Target class or active state styling in `MobileDashboard.jsx` using React state or routing.

## Code Layout
- `src/pages/Login.jsx`: Authentication UI
- `src/pages/MobileDashboard.jsx`: Navigation and main dashboard structure
- `src/styles.css`: CSS styles for elements
