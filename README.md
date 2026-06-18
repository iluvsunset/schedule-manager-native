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

## Download & Installation

1. Go to the [Releases](https://github.com/iluvsunset/schedule/releases) page.
2. Download the latest `Schedule_Manager_...app.tar.gz` file for macOS.
3. Extract the downloaded file and drag **Schedule Manager** into your `/Applications` folder.
4. **Bypass Apple Gatekeeper:** Since this application is not notarized by Apple, macOS will prevent it from opening initially. To fix this, open your Terminal and run the following command:
   ```bash
   xattr -d com.apple.quarantine "/Applications/Schedule Manager.app"
   ```
5. Open the app from your Applications folder and enjoy!

## Architecture
- **Frontend**: React + Vite, Framer Motion for animations.
- **Backend**: Firebase Firestore (Data), Firebase Functions / Vercel API (Webhooks).
- **Desktop Core**: Tauri v2 in Rust.

## License
MIT License
