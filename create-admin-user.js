// User Management Utility
// Run this script with Node.js after logging in as admin

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase config (replace with your actual config)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Create a new user with admin privileges
 */
async function createAdminUser(email, password, name) {
  try {
    console.log(`Creating admin user: ${email}`);
    
    // Check if user already exists in Firestore
    const userQuery = query(
      collection(db, 'web_users'),
      where('email', '==', email)
    );
    
    const userSnapshot = await getDocs(userQuery);
    if (!userSnapshot.empty) {
      console.log('User already exists in Firestore');
      // Could update the user here if needed
      return;
    }
    
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create admin profile in Firestore
    const userProfile = {
      uid: user.uid,
      email: user.email,
      name: name,
      role: 'admin', // Set as admin
      permissions: {
        dashboard: true,
        bookings: true,
        confirmation: true,
        withdrawal: true,
        access: true,
        images: true,
        users: true
      },
      isActive: true,
      createdAt: Date.now()
    };
    
    // Save to Firestore
    await setDoc(doc(db, 'web_users', user.uid), userProfile);
    
    console.log(`Admin user created successfully: ${email}`);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Example usage:
// Replace with your desired email/password/name
createAdminUser('tofer.rrnewtech@gmail.com', 'YourSecurePassword123', 'Tofer');
