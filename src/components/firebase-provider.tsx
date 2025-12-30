
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics, isSupported } from "firebase/analytics";
import { Icon } from '@/components/icons';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD2-QPCyQBZUvJUGkKtCkLle6i8OITlhXE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "delfenceinvoice.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "delfenceinvoice",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "delfenceinvoice.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "755886893480",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:755886893480:web:f020701c36246180abd59d",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-T9HNW4B36L",
};

// Validate Firebase config
if (typeof window !== 'undefined') {
  console.log('Firebase config loaded:', {
    hasApiKey: !!firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId
  });
}

interface FirebaseContextType {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  analytics: Analytics | null;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
};

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<Omit<FirebaseContextType, 'loading'>>({
    app: null,
    db: null,
    auth: null,
    storage: null,
    analytics: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.error('Firebase initialization timeout - forcing load complete');
        setError('Firebase is taking longer than expected to initialize. Please check your internet connection and refresh the page.');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    const initFirebase = async () => {
      try {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        const auth = getAuth(app);
        const db = getFirestore(app);
        const storage = getStorage(app);

        let analytics: Analytics | null = null;
        if (firebaseConfig.measurementId) {
          try {
            const supported = await isSupported();
            if (supported) {
              analytics = getAnalytics(app);
            }
          } catch (error) {
            // Analytics not supported, continue without it
            console.warn('Firebase Analytics not supported:', error);
          }
        }

        if (mounted) {
          setServices({ app, auth, db, storage, analytics });
          setLoading(false);
          clearTimeout(timeoutId);
        }
      } catch (e) {
        console.error('Firebase initialization error:', e);
        if (mounted) {
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    initFirebase();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const value = { ...services, loading };

  return (
    <FirebaseContext.Provider value={value}>
      {loading ? (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
          <Icon name="Loader2" className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Connecting to services...</p>
          {error && (
            <div className="mt-6 max-w-md text-center p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}
        </div>
      ) : (
        children
      )}
    </FirebaseContext.Provider>
  );
}
