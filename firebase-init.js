"use strict";

(function initFirebase() {
  if (!window.firebase) {
    window.firebaseReady = false;
    return;
  }

  const config = window.FIREBASE_CONFIG;
  if (!config || !config.apiKey || config.apiKey === "REPLACE_WITH_API_KEY") {
    window.firebaseReady = false;
    return;
  }

  if (!window.firebase.apps.length) {
    window.firebase.initializeApp(config);
  }

  window.firebaseServices = {
    auth: window.firebase.auth(),
    db: window.firebase.firestore ? window.firebase.firestore() : null
  };
  window.firebaseReady = true;
})();
