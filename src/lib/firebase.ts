
// This file is intended for server-side Firebase Admin SDK, or for exporting types and functions
// that are environment-agnostic.

// FOR CLIENT-SIDE FIREBASE, USE `src/lib/firebase-client.ts`

import {
  getFirestore,
  type Firestore,
  runTransaction,
  collection,
  doc,
  getDoc,
  writeBatch,
  query,
  where,
  orderBy,
  getDocs,
  type DocumentReference,
  documentId,
} from 'firebase/firestore';

// Re-exporting these for server-side usage if needed, or for consistent import paths.
export {
  runTransaction,
  collection,
  doc,
  getDoc,
  writeBatch,
  query,
  where,
  orderBy,
  getDocs,
  type DocumentReference,
  documentId,
  type Firestore,
};

// IMPORTANT: NO CLIENT-SIDE INITIALIZATION HERE
// The 'db' and 'auth' exports have been moved to `firebase-client.ts`
// to ensure they are only initialized on the client.
// This prevents the "NEXT_PUBLIC_ variable not found" error during server-side build.


