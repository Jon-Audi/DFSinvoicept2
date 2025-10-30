
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/components/firebase-provider';
import { useToast } from "@/hooks/use-toast";
import { ROLE_PERMISSIONS } from '@/lib/constants';
import type { User } from '@/types';
import { Icon } from '@/components/icons';

// --- Auth Context ---
export interface AppUser extends FirebaseUser {
  role?: User['role'];
  permissions?: User['permissions'];
}
interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, pass: string, firstName: string, lastName: string) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { auth, db, loading: firebaseLoading } = useFirebase();
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (firebaseLoading || !auth || !db) {
      setAuthLoading(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            const appUser: AppUser = {
              ...firebaseUser,
              role: userData.role,
              permissions: userData.permissions,
            };
            setUser(appUser);
          } else {
            // User exists in Auth, but not in 'users' collection yet.
            // This can happen during sign-up flow.
            setUser(firebaseUser); 
          }
        } catch (e) {
          console.error("Error fetching user document:", e);
          setUser(firebaseUser); // Fallback to basic user
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db, firebaseLoading]);

  const login = async (email: string, pass: string) => {
    if (!auth) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast({ title: "Logged In", description: "Successfully logged in." });
      router.push('/dashboard');
    } catch (e: any) {
      setAuthError(e.message);
      toast({ title: "Login Failed", description: e.message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    if (!auth) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      await firebaseSignOut(auth);
      toast({ title: "Logged Out", description: "Successfully logged out." });
      router.push('/login');
    } catch (e: any) {
      setAuthError(e.message);
      toast({ title: "Logout Failed", description: e.message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const signup = async (email: string, pass: string, firstName: string, lastName: string) => {
    if (!auth || !db) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser = userCredential.user;
      await updateProfile(newUser, { displayName: `${firstName} ${lastName}` });
      
      const userDocRef = doc(db, 'users', newUser.uid);
      const newUserProfile: User = {
        id: newUser.uid,
        email: newUser.email!,
        firstName,
        lastName,
        role: 'User', 
        isActive: true, 
        permissions: ROLE_PERMISSIONS['User'],
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, newUserProfile);
      
      // Update local auth state immediately with new user profile data
      setUser({ ...newUser, ...newUserProfile });
      
      toast({ title: "Account Created", description: "Successfully signed up and logged in." });
      router.push('/dashboard');
    } catch (e: any) {
      setAuthError(e.message);
      toast({ title: "Signup Failed", description: e.message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };
  
  // The value provided to the context consumers
  const authContextValue = { user, setUser, loading: authLoading || firebaseLoading, error: authError, login, logout, signup };
  
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}
