
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

// This function acts as a singleton provider for Firebase services
function getFirebaseClient() {
    let app: FirebaseApp;
    let auth: Auth;
    let db: Firestore;
    let storage: FirebaseStorage;
    let analytics: Analytics | undefined;
    
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
        isSupported().then(supported => {
            if(supported) {
                analytics = getAnalytics(app);
            }
        });
    }

    return { app, auth, db, storage, analytics };
}

// You can export the function if you need to call it explicitly,
// but for direct use in components, we'll export the initialized services.
// Note: This approach might still have issues in SSR if modules are loaded before initialization.
// A better approach is using a context provider.
const { app, auth, db, storage, analytics } = getFirebaseClient();

export { app, auth, db, storage, analytics, getFirebaseClient };
