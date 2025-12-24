import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA-tC1LgP3g9ZbTog5aIF62js-1mGXbqHg",
  authDomain: "movieguide-pwa.firebaseapp.com",
  databaseURL: "https://movieguide-pwa-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "movieguide-pwa",
  storageBucket: "movieguide-pwa.firebasestorage.app",
  messagingSenderId: "255222845552",
  appId: "1:255222845552:web:aede60b8a14496a8b8a4b5",
  measurementId: "G-F0X1PN7EK5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

