
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

// This function safely gets the initialized Firebase app instance.
function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  } else {
    return getApp();
  }
}

// This function initializes all services and returns them.
// It's designed to be called once inside the FirebaseProvider.
export function initializeFirebaseServices() {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  
  let analytics: Analytics | null = null;
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    isSupported().then(supported => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    });
  }

  return { app, auth, db, storage, analytics };
}

// A function to get the services if you absolutely need them outside of the React context,
// but use of the useFirebase hook is strongly preferred.
export function getFirebaseClient() {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    let analytics: Analytics | null = null;

    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      isSupported().then(supported => {
        if (supported) {
            analytics = getAnalytics(app);
        }
      });
    }
    
    return { app, auth, db, storage, analytics };
}

// We no longer export the instances directly to prevent race conditions.
// Components should use the `useFirebase` hook provided by `FirebaseProvider`.
