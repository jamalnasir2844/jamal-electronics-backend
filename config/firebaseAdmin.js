const admin = require('firebase-admin');

const initializeFirebaseAdmin = () => {
  if (admin.apps.length === 0) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

      if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        privateKey
      ) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          }),
        });
        console.log('Firebase Admin initialized with service account.');
      } else {
        // Fallback: initialize with just projectId for token verification
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'reactprojects-25a25',
        });
        console.log('Firebase Admin initialized with project ID only.');
      }
    } catch (error) {
      console.error('Firebase Admin initialization error:', error.message);
    }
  }
  return admin;
};

module.exports = initializeFirebaseAdmin;
