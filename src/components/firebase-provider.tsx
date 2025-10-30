"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics, isSupported } from "firebase/analytics";
import { Icon } from '@/components/icons';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

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

  useEffect(() => {
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const auth = getAuth(app);
      const db = getFirestore(app);
      const storage = getStorage(app);
      
      let analytics: Analytics | null = null;
      if (firebaseConfig.measurementId) {
        isSupported().then(supported => {
          if (supported) {
            analytics = getAnalytics(app);
            setServices({ app, auth, db, storage, analytics });
          } else {
            setServices({ app, auth, db, storage, analytics: null });
          }
          setLoading(false);
        });
      } else {
        setServices({ app, auth, db, storage, analytics: null });
        setLoading(false);
      }
    } catch (e) {
      console.error("Failed to initialize Firebase", e);
      setLoading(false);
    }
  }, []);

  const value = { ...services, loading };
  
  if (loading) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Icon name="Loader2" className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Connecting to services...</p>
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}
