# Schedule Manager Native

Schedule Manager is a native macOS application for managing, organizing, and sharing class schedules.
Built with Tauri v2, React, and Firebase, it provides a highly polished, premium desktop experience.

## Features
- **Native Desktop App**: Fast and secure, running as a macOS native window.
- **Auto-Update System**: Over-The-Air (OTA) secure updates via Tauri Updater and Vercel manifest.
- **Schedule Management**: Create, edit, and categorize schedules for your classes.
- **Sharing**: Generate shareable links for your schedule. Web users are directed to download the desktop application.
- **Integration**: Works seamlessly with Google Calendar.
- **Beautiful UI**: Modern glassmorphism design with Framer Motion animations.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Rust (for Tauri core)
- Xcode Command Line Tools (for macOS compilation)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/iluvsunset/schedule.git
   cd schedule
   ```

2. Install JavaScript dependencies:
   ```bash
   npm install
   ```

3. Run the application in development mode:
   ```bash
   npm run tauri dev
   ```

### Building for Production
To build the macOS release bundle:
```bash
npm run tauri build
```
This generates the `.app.tar.gz` and `.dmg` installers inside `src-tauri/target/release/bundle/macos/`.

## Architecture
- **Frontend**: React + Vite, Framer Motion for animations.
- **Backend**: Firebase Firestore (Data), Firebase Functions / Vercel API (Webhooks).
- **Desktop Core**: Tauri v2 in Rust.

## License
MIT License
