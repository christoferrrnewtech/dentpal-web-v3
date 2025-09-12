// Firebase Configuration and Service Setup for DentPal
import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9chK8ZPQ52uuM8jOKKP3Xdjmpy4xmJEo",
  authDomain: "dentpal-161e5.firebaseapp.com",
  databaseURL: "https://dentpal-161e5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dentpal-161e5",
  storageBucket: "dentpal-161e5.firebasestorage.app",
  messagingSenderId: "606033398344",
  appId: "1:606033398344:web:65a1c7ff689121946aa67d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Export the app instance for use in other services
export default app;

// Firebase service initialization check
console.log('🔥 Firebase initialized successfully');
console.log('📁 Project ID:', firebaseConfig.projectId);
console.log('🔐 Auth Domain:', firebaseConfig.authDomain);
