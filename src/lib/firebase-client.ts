
"use client";

// This file is for CLIENT-SIDE Firebase initialization and exports.
// It should only be imported in client components.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | undefined;

if (!firebaseConfig.projectId) {
  const errMsg = "Firebase project ID is not defined. Please ensure your .env.local file is correctly set up with NEXT_PUBLIC_FIREBASE_PROJECT_ID.";
  console.error(`[FirebaseInit] ${errMsg}`);
  // We throw an error on the client to make it obvious during development.
  // The server-side build will no longer crash.
  throw new Error(`CRITICAL RUNTIME ERROR: ${errMsg}`);
}

if (getApps().length) {
  app = getApp();
} else {
  app = initializeApp(firebaseConfig);
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

if (typeof window !== "undefined" && firebaseConfig.measurementId) {
    try {
        analytics = getAnalytics(app);
    } catch (error) {
        console.error("Failed to initialize Analytics", error);
        // Analytics might not be supported in all environments (e.g., extensions)
    }
}

export { app, db, auth, storage, analytics };
