// src/lib/firebase.ts

// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getFirestore, Firestore, runTransaction, collection, doc, getDoc, writeBatch, query, where, orderBy, getDocs, DocumentReference, documentId } from 'firebase/firestore'; // Import Firestore related functions
import { getAuth, Auth } from 'firebase/auth'; // Import Auth related functions
import { getStorage, FirebaseStorage } from 'firebase/storage'; // Import Storage related functions

// This configuration relies on Next.js's built-in support for .env.local.
// Ensure you have a .env.local file with your Firebase project's web app config.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// CRITICAL: The check for project ID is removed to prevent build-time crashes.
// The Firebase SDK will provide runtime errors if the config is invalid.
// It is essential that the .env.local file is correctly configured for the app to run.

let app: FirebaseApp;
let db: Firestore;
let authInstance: Auth;
let storage: FirebaseStorage;
let analytics: Analytics | undefined;

// Initialize Firebase
if (getApps().length) {
  app = getApp();
} else {
  // Only initialize if the project ID is available.
  if (firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
  } else {
    // This will prevent the app from crashing during build but will show errors in the console at runtime if not configured.
    console.error("Firebase config is missing Project ID. App will not be initialized.");
    // Assign a dummy app to prevent further crashes, although Firebase will not work.
    app = {} as FirebaseApp;
  }
}

db = getFirestore(app);
authInstance = getAuth(app);
storage = getStorage(app);

// Initialize Analytics only in the browser
if (typeof window !== "undefined") {
  try {
    if (firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    } else {
      analytics = undefined;
    }
  } catch (error) {
    console.log("Failed to initialize Firebase Analytics", error);
    analytics = undefined;
  }
}

export { app, db, authInstance as auth, storage, analytics, runTransaction, collection, doc, getDoc, writeBatch, query, where, orderBy, getDocs, DocumentReference, documentId };
