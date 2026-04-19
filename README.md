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
1) From the project folder, run: `npm start`
2) Open: `http://localhost:4000`

The Node server serves the static site and the Bunny upload endpoint.

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

Bunny setup
1) Create a Bunny Storage Zone.
2) Connect a Bunny Pull Zone to that storage zone.
3) Copy `.env.example` to `.env`.
4) Fill in:
   - `BUNNY_STORAGE_ZONE`: storage zone name.
   - `BUNNY_STORAGE_ACCESS_KEY`: storage zone password from FTP & API Access.
   - `BUNNY_STORAGE_ENDPOINT`: storage API endpoint for the zone region.
   - `BUNNY_CDN_BASE_URL`: pull zone URL, for example `https://your-zone.b-cdn.net`.
5) Restart `npm start`.

Profile photo uploads go through `/api/bunny/profile-photo`, then Firestore stores
the returned Bunny CDN URLs in `profiles/{email}.photos`.
