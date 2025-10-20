"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/components/firebase-provider';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { ROLE_PERMISSIONS } from '@/lib/constants';
import type { User } from '@/types'; 

interface AppUser extends FirebaseUser {
  role?: User['role'];
  permissions?: User['permissions'];
}

interface AuthContextType {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, pass: string, firstName: string, lastName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { auth, db } = useFirebase();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!auth || !db) {
        setLoading(true);
        return;
    };
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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
          // Fallback for users that exist in Auth but not in Firestore 'users' collection
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db]);

  const login = async (email: string, pass: string) => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast({ title: "Logged In", description: "Successfully logged in." });
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Login Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      toast({ title: "Logged Out", description: "Successfully logged out." });
      router.push('/login');
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Logout Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, pass: string, firstName: string, lastName: string) => {
    if (!auth || !db) return;
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser = userCredential.user;

      await updateProfile(newUser, { displayName: `${firstName} ${lastName}` });
      
      const userDocRef = doc(db, 'users', newUser.uid);
      const newUserProfile: User = {
        id: newUser.uid,
        email: newUser.email!,
        firstName: firstName,
        lastName: lastName,
        role: 'User',
        isActive: true,
        permissions: ROLE_PERMISSIONS['User'],
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, newUserProfile);
      
      toast({ title: "Account Created", description: "Successfully signed up and logged in." });
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Signup Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, error, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
