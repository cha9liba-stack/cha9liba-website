import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

// Firebase Web config — apiKey is optional for public read-only databases
// The app uses REST API directly for reads/writes, SDK only for realtime listeners
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummy-placeholder-not-needed-for-rest",
  authDomain: "palmarentacare.firebaseapp.com",
  databaseURL: "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "palmarentacare",
  storageBucket: "palmarentacare.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000",
};

let db: ReturnType<typeof getDatabase>;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getDatabase(app);
} catch (e) {
  console.warn("[Firebase] SDK init failed, REST-only mode:", e);
  // Create a dummy db object — REST API will be used instead
  db = null as any;
}

export { db };
