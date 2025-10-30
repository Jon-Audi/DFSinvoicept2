
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let analytics: Analytics | undefined;


if (typeof window !== 'undefined' && getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    if (firebaseConfig.measurementId) {
      isSupported().then(supported => {
        if (supported) {
          analytics = getAnalytics(app);
        }
      });
    }
  } catch (e) {
    console.error("Failed to initialize Firebase on the client", e);
  }
} else if (typeof window !== 'undefined') {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  if (firebaseConfig.measurementId) {
    isSupported().then(supported => {
        if(supported) {
            analytics = getAnalytics(app);
        }
    });
  }
}

export function getFirebaseClient() {
    if (!app) {
        // This can happen in a server context or if initialization fails
        // For client-side, the above block should handle it.
        // We can throw an error or handle it gracefully.
        throw new Error("Firebase has not been initialized. Make sure you are using FirebaseProvider.");
    }
    return { app, auth, db, storage, analytics };
}
