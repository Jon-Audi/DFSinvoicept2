
'use server';

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase-client';

interface Article {
  title: string;
  content: string;
}

interface Colors {
  warm: string[];
  cold: string[];
}

interface Info {
  Age: number;
  Name: string;
  Birthday: Timestamp; // Firestore Timestamp
  Address: string;
}

interface PdfPlumConfig {
  templatePath: string;
  outputFileName: string;
  chromiumPdfOptions: {
    printBackground: boolean;
  };
  adjustHeightToFit: boolean;
}

interface PdfDemoDocumentData {
  text: string;
  flag: string;
  articles: Article[];
  colors: Colors;
  info: Info;
  _pdfplum_config: PdfPlumConfig;
}

/**
 * Creates a demo document in the 'pdfPlumDemoDocs' collection in Firestore.
 * This document matches the structure you provided and is intended for use
 * with a PDF generation Firebase Extension like PDFPlum.
 * 
 * The 'Birthday' field is converted from '1985/06/20' to a Firestore Timestamp.
 */
export async function createPdfDemoDocument(): Promise<string | null> {
  console.log("Attempting to create PDF demo document in Firestore...");
  try {
    // This server action uses a client-side SDK pattern, which is not ideal.
    // A better approach would be to use the Firebase Admin SDK on the server.
    // For the purpose of this file, we assume it gets a valid DB instance.
    // If this runs on the server during a build, it might fail if not configured for server-side execution.
    const { db } = getFirebaseClient();
    if (!db) {
      throw new Error("Firestore database is not available. This action might be running in a context where Firebase client is not initialized.");
    }

    const docData: PdfDemoDocumentData = {
      text: "Lorem ipsum dolor sit amet consectetur adipisicing elit.",
      flag: "OK",
      articles: [
        { title: "ABCD", content: "Abcd content" },
        { title: "EFGH", content: "Efgh content" },
        { title: "IJKL", content: "Ijkl content" },
        { title: "MNOP", content: "Mnop content" },
        { title: "QRST", content: "Qrst content" }
      ],
      colors: {
        warm: ["Red", "Yellow", "Orange"],
        cold: ["Green", "Blue", "Gray"]
      },
      info: {
        Age: 38,
        Name: "John Doe",
        // The date string '1985/06/20' is parsed into a JavaScript Date object,
        // which Firebase SDK then converts to a Firestore Timestamp.
        Birthday: Timestamp.fromDate(new Date("1985-06-20T00:00:00.000Z")), 
        Address: "Silicon Valley"
      },
      _pdfplum_config: {
        templatePath: "delfenceinvoice.firebasestorage.app/template", // Ensure this path is correct for your Storage bucket
        outputFileName: "demo.pdf",
        chromiumPdfOptions: { printBackground: true },
        adjustHeightToFit: false
      },
    };

    const docRef = await addDoc(collection(db, "pdfPlumDemoDocs"), docData);
    console.log("PDF demo document created with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating PDF demo document in Firestore:", error);
    return null;
  }
}

    