import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAFSnxJh4j9tJ-ccZnEQHdoN4XDVKtMooI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "academic-os-3796b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "academic-os-3796b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "academic-os-3796b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "164187489403",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:164187489403:web:6a604528703330309ccede",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-F9TDSEWQZR",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
