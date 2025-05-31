
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// User-provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDl26LUxzdmiDf40fJ5b-8gGEStwm-VnUY",
  authDomain: "witwaves.firebaseapp.com",
  projectId: "witwaves",
  storageBucket: "witwaves.firebasestorage.app", // Updated as per user's snippet
  messagingSenderId: "109711058796",
  appId: "1:109711058796:web:ae9bf478689547e7363549"
  // measurementId is not in the user's provided snippet, so it's omitted.
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

export { app, auth, db, storage };
