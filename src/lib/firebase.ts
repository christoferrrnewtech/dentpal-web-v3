// 🔥 REPLACE THIS WITH YOUR ACTUAL FIREBASE PROJECT CONFIG 🔥
// Get it from: https://console.firebase.google.com → Project Settings → General Tab
const firebaseConfig = {
  apiKey: "AIzaSyD9chK8ZPQ52uuM8jOKKP3Xdjmpy4xmJEo",
  authDomain: "dentpal-161e5.firebaseapp.com",
  projectId: "dentpal-161e5",
  storageBucket: "dentpal-161e5.firebasestorage.app",
  messagingSenderId: "606033398344",
  appId: "1:606033398344:web:65a1c7ff689121946aa67d"
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const app = initializeApp(firebaseConfig);

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export default app;
