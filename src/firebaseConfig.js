import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

export const app = initializeApp({
  apiKey: "AIzaSyDueAy790_hFW6Aye2FYghRge6FOlRryFw",
  authDomain: "ai-app-companion.firebaseapp.com",
  projectId: "ai-app-companion",
  storageBucket: "ai-app-companion.firebasestorage.app",
  messagingSenderId: "506059414782",
  appId: "1:506059414782:web:70977d87fdd280f05b59af"
});

// App Check (disabled for development)
// initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider("6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"),
//   isTokenAutoRefreshEnabled: true,
// });

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const auth = getAuth(app);
export const functions = getFunctions(app, "us-central1");

// Build stamp
console.log("[Bestibule] build", new Date().toISOString());
