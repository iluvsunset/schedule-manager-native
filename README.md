# 🗓️ Schedule Manager Native 

![Version](https://img.shields.io/badge/version-v0.1.3-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Apple%20Silicon-lightgrey.svg)
![Framework](https://img.shields.io/badge/framework-Tauri%20v2-orange.svg)
![Frontend](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite-blueviolet.svg)
![Backend](https://img.shields.io/badge/backend-Firebase%20%7C%20Vercel-yellow.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Schedule Manager Native** is a highly polished, enterprise-grade native desktop application tailored explicitly for macOS (Apple Silicon). Engineered to revolutionize the way students, teachers, and professionals organize their daily workflows, the application delivers a premium, seamless, and lightning-fast desktop experience. 

By leveraging the power of Rust-based **Tauri v2**, fluid **Framer Motion** glassmorphic animations, a robust **Firebase** backend, and the cutting-edge intelligence of **Google's Gemini 3.5 Flash AI**, Schedule Manager bridges the gap between beautiful aesthetics and extreme functionality.

---

## 🌟 Key Features & Capabilities

### 1. 🖥️ Blazing Fast Native Desktop Experience
Powered by Tauri v2 and Rust, the application completely abandons the bloated Electron framework paradigm. It operates securely and natively, ensuring minimal memory footprint, sub-second cold starts, and a deeply integrated macOS windowing system. 

### 2. 🤖 Gemini AI Place Scraper & Intelligent Caching
Schedule Manager is not just a calendar—it's an intelligent location assistant. When an event location is entered, the app invokes a custom headless Chrome scraper (`puppeteer-core`) paired with Google's Generative AI (`gemini-3.5-flash`). 
- **AI-Generated Summaries:** Instantly retrieves rich metadata, including contact info, website, ratings, category, and an AI-generated concise summary of the location.
- **Smart Alias Caching System:** The backend features a dual-layer caching strategy stored in Firestore. It keys scraped data by the exact street address, ensuring that if multiple distinct events occur at the same location, the backend instantly hits the cache, bypassing redundant network and AI calls. Cache results persist for 14 days globally across the platform.

### 3. 🗺️ Integrated Interactive Maps
Built-in Leaflet Maps integration pinpoints exactly where your next class or meeting is occurring. The map features custom zoom levels, sleek glowing blue dot markers, and intelligent cover image fallback rendering when gallery images are unavailable.

### 4. 🔄 Zero-Downtime Over-The-Air (OTA) Updates
Security and feature iteration are paramount. The application utilizes Tauri's built-in `updater` plugin paired with cryptographic signatures (`.sig`). A remote Vercel-hosted JSON manifest tracks the latest versions, allowing the application to download, verify, and silently update itself without requiring users to manually download new DMG files.

### 5. 📅 Google Calendar Two-Way Synchronization
A robust synchronization engine securely connects to user Google accounts, fetching, mapping, and tracking external events. Webhooks and cron-based reminders keep the schedule deeply integrated into the user's existing Google ecosystem.

### 6. ✨ 10x Premium Designer UI/UX
The application is wrapped in a meticulously crafted aesthetic. It uses custom CSS variables, pure HSL palettes, micro-animations, glassmorphism UI layers, and fluid layout transitions. Dropdowns, modals, and lists feel alive, interactive, and natively smooth.

---

## 📥 Download & Installation Guide

Because Schedule Manager is distributed independently and rapidly iterated upon outside of the Mac App Store, it is not currently notarized by Apple. As a result, macOS **Gatekeeper** will aggressively block the application on its first launch. 

**Follow these instructions meticulously to install the application:**

1. Navigate to the [Releases](https://github.com/iluvsunset/schedule-manager-native/releases) page.
2. Download the latest release asset ending in **`_aarch64.dmg`** (e.g., `Schedule_Manager_0.1.3_aarch64.dmg`).
   > ⚠️ **CRITICAL:** Do NOT download the `.app.tar.gz` file. That file is specifically engineered for the internal cryptographic OTA updater and will not function as a manual installer.
3. Double-click the downloaded `.dmg` file to mount the disk image.
4. Drag and drop the **Schedule Manager** application icon into your `/Applications` folder alias.
5. **BYPASS APPLE GATEKEEPER:**
   Because this application is not digitally notarized by an Apple Developer ID, macOS will flag it as "damaged" or "from an unidentified developer." **The ONLY way to bypass this on modern macOS versions is via the Terminal.**
   
   Open your **Terminal** (`Cmd + Space` -> type "Terminal" -> `Enter`), and execute the following command exactly as written:
   
   ```bash
   xattr -cr "/Applications/Schedule Manager.app"
   ```
   *Note: This command recursively clears the extended attributes (including the quarantine flag) from the application bundle, allowing macOS to execute the Rust binary safely.*

6. Launch **Schedule Manager** from your Launchpad or Applications folder. 

---

## 🏗️ System Architecture & Engineering Deep Dive

Schedule Manager is built on a modern, decoupled architecture designed for scale, security, and speed.

### 🔹 1. The Core Application Layer (Tauri / Rust)
- **Engine:** Tauri v2
- **Language:** Rust (for the backend interop) / HTML, CSS, JavaScript (Frontend)
- **Role:** Handles OS-level window management, secure system tray integration, deep linking, native notifications, and cryptographic bundle verification for OTA updates.
- **Why Tauri?** By relying on the OS's native webview (WKWebView on macOS) instead of bundling Chromium, the final application size is reduced by roughly 80% compared to Electron apps, with vastly superior RAM utilization.

### 🔹 2. The Presentation Layer (React + Vite)
- **Framework:** React 18, bundled via Vite for extremely fast Hot Module Replacement (HMR) during development.
- **Styling:** Vanilla CSS3 utilizing a highly strictly enforced design token system. No heavy UI libraries are used, ensuring DOM rendering is as fast as mathematically possible.
- **Animation:** `framer-motion` handles complex component mounting/unmounting and layout morphing (e.g., expanding map modals, shimmer loading states).
- **State Management:** React Context API paired with custom hooks (`useAuth`, `useSchedule`) to minimize prop-drilling while avoiding Redux boilerplate.

### 🔹 3. The Backend Infrastructure (Firebase / Google Cloud)
- **Database (Firestore):** A NoSQL document database storing User Profiles, Schedules, and the `places_cache`.
- **Authentication:** Firebase Auth handling email/password and Google OAuth workflows.
- **File Storage:** Firebase Cloud Storage for user avatars and custom background images.

### 🔹 4. The Microservices Layer (Vercel Node.js Serverless)
To circumvent CORS restrictions and protect sensitive API keys, the application relies on external serverless endpoints:
- **`api/places.js` (The Scraper Engine):** 
  - Initializes a headless `puppeteer-core` browser via Browserless API.
  - Navigates to Google Maps to resolve user-inputted locations.
  - Extracts coordinates, ratings, image URLs (including CSS background thumbnails and CDN `/p/` routes).
  - Pipes the extracted data into **Gemini 3.5 Flash** with a highly structured prompt to generate a JSON response summarizing the location.
  - Commits the result to the Firestore `places_cache` collection, keying by both the raw query and the final resolved physical address to guarantee maximum cache hit rates across the platform.

### 🔹 5. The CI/CD & OTA Pipeline
- **Bundling:** `npm run tauri build` compiles the React frontend and compiles the Rust binary.
- **Packaging:** Generates a `.dmg` for initial installation and a `.tar.gz` for updates.
- **Signing:** The `.tar.gz` is cryptographically signed using `minisign` (`tauri signer`) with an offline private key.
- **Distribution:** The signature, version, and download URL are committed to `public/updater.json`.
- **Deployment:** When pushed to GitHub, Vercel automatically deploys the frontend and the `/updater.json` manifest. Active desktop clients ping this manifest, verify the ed25519 signature, and hot-swap the binary.

---

## 🛠️ Developer Setup & Contribution

Want to build Schedule Manager from source? Ensure you have the following prerequisites installed on your macOS machine:

- **Node.js** (v18 or higher)
- **Rust** (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **Xcode Command Line Tools** (`xcode-select --install`)

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/iluvsunset/schedule-manager-native.git
   cd schedule-manager-native
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   You will need to create a `.env.local` file containing the necessary Firebase Admin credentials, Gemini API Keys, and Browserless API tokens.

4. Run the development server:
   ```bash
   npm run tauri dev
   ```
   *This command spins up the Vite development server and the Tauri Rust watcher simultaneously.*

5. Building for Production:
   ```bash
   npm run tauri build
   ```
   *Note: Building requires the `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to successfully generate the signed updater artifacts.*

---

## 🔒 Security Notice

Schedule Manager takes user privacy seriously:
- Your Google Calendar tokens are never stored in plaintext.
- The `tauri.conf.json` enforces strict security constraints, disabling dangerous IPC commands and restricting network scopes.
- The OTA updater will strictly refuse to install any bundle that cannot be mathematically proven to originate from our internal `tauri-signer.key` pair.

## 📄 License
This project is licensed under the **MIT License**. Feel free to fork, modify, and distribute as you see fit.

---
*Crafted with precision, design, and a lot of coffee. ☕️*
