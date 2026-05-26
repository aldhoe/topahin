import * as admin from "firebase-admin";

// Shared Firebase Admin SDK initialization
// Used by API routes (approve/reject deposits)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error: unknown) {
    console.error("Firebase Admin Init Error:", error);
  }
}

export const dbAdmin = admin.firestore();
export { admin };
