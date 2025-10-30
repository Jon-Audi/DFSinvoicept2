
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
            let appUser: AppUser = {
              ...firebaseUser,
              role: userData.role,
              permissions: userData.permissions,
            };

            // HARDCODED FIX: Ensure specific user has admin permissions
            if (firebaseUser.uid === 'BpLtCifhXjRC97Lr6zZCg2l2w412') {
              appUser.role = 'Admin';
              appUser.permissions = ROLE_PERMISSIONS['Admin'];
            }

            setUser(appUser);
          } else {
            // Self-healing: User is authenticated but has no DB record.
            console.warn(`User with UID ${firebaseUser.uid} authenticated but has no user document. Creating one now.`);
            
            const [firstName, lastName] = (firebaseUser.displayName || "New User").split(" ");

            const newUserProfile: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              firstName: firstName || "User",
              lastName: lastName || "",
              role: 'Admin', // Default to Admin for self-healed accounts
              isActive: true, 
              permissions: ROLE_PERMISSIONS['Admin'],
              createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
            };
            await setDoc(userDocRef, newUserProfile);
            
            const appUser: AppUser = {
              ...firebaseUser,
              ...newUserProfile,
            };
            setUser(appUser);
            toast({
              title: "Profile Created",
              description: "Your user profile was automatically created."
            });
          }
        } catch (e) {
          console.error("Error fetching or creating user document:", e);
          setUser(firebaseUser); // Fallback to basic user
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db, firebaseLoading, toast]);

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
      await updateProfile(newUser, { displayName: `${firstName} ${lastName}`.trim() });
      
      const userDocRef = doc(db, 'users', newUser.uid);
      const newUserProfile: User = {
        id: newUser.uid,
        email: newUser.email!,
        firstName,
        lastName,
        role: 'Admin', 
        isActive: true, 
        permissions: ROLE_PERMISSIONS['Admin'],
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, newUserProfile);
      
      const appUser: AppUser = { ...newUser, ...newUserProfile };
      setUser(appUser);
      
      toast({ title: "Account Created", description: "Successfully signed up and logged in." });
      router.push('/dashboard');
    } catch (e: any) {
      setAuthError(e.message);
      toast({ title: "Signup Failed", description: e.message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };
  
  const authContextValue = { user, setUser, loading: authLoading || firebaseLoading, error: authError, login, logout, signup };
  
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}
