Dating App (Nigeria) - Static Site

Overview
- Static HTML/CSS/JavaScript dating site prototype.
- Core sections: Profile, People, Liked You, Chats.
- Authentication: Firebase Authentication (email/password).
- App data storage: Cloud Firestore.
- Current Firestore-backed collections: `users`, `profiles`, `likes`, `chatThreads`,
  `chatMessages`, `memberships`, `likeSeen`, `messageSeen`, `dashboardFilters`.
- Profile images are currently stored with the profile document as temporary data URLs.
  Replace this with Bunny-hosted URLs when Bunny upload is configured.

Run locally
1) From the project folder, run: `python3 -m http.server 4000`
2) Open: `http://localhost:4000`

Optional npm shortcut
- `npm start` runs the same local static server.

Firebase setup
1) Create a Firebase project and add a Web app.
2) Enable Email/Password in Authentication.
3) Create a Firestore database.
4) Update `firebase-config.js` with your Firebase web config values.
5) In Firestore rules, paste and publish the contents of `firestore.rules`.

Local test mode (without Firebase)
- If `firebase-config.js` is not configured, signup/login still works in local mode.
- Accounts and dating data are saved in browser `localStorage`.
- This is device/browser specific and for testing only.
