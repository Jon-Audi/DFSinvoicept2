
"use client";

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

// Singleton pattern to initialize and get Firebase services
const initializeClientApp = () => {
  if (getApps().length > 0) {
    return getApp();
  }
  
  if (!firebaseConfig.projectId) {
     // This will only be thrown in the browser during development if the .env file is missing
     throw new Error("[Firebase] Project ID is not defined. Check your .env.local file.");
  }
  
  const app = initializeApp(firebaseConfig);

  // Initialize Analytics only on the client side
  if (typeof window !== "undefined" && firebaseConfig.measurementId) {
    try {
      getAnalytics(app);
    } catch (error) {
      console.error("[Firebase] Failed to initialize Analytics", error);
    }
  }
  return app;
};

const app: FirebaseApp = initializeClientApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const analytics: Analytics | undefined = (typeof window !== 'undefined' && firebaseConfig.measurementId) ? getAnalytics(app) : undefined;


export { app, db, auth, storage, analytics };
