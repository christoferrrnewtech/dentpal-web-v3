// Firebase connection test utility
import { auth, db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

export async function testFirebaseConnection() {
  try {
    console.log('🔥 Testing Firebase connection...');
    
    // Test 1: Check if Firebase is initialized
    console.log('Auth instance:', auth);
    console.log('Firestore instance:', db);
    console.log('Firebase project ID:', auth.app.options.projectId);
    console.log('Auth domain:', auth.app.options.authDomain);
    console.log('Current user:', auth.currentUser);
    
    // Test 2: Try to read from Firestore
    console.log('🔥 Testing Firestore read access...');
    const testCollectionRef = collection(db, 'web_users');
    const snapshot = await getDocs(testCollectionRef);
    console.log('✅ Firestore read successful, document count:', snapshot.size);
    
    // Test 3: Try to write to Firestore (test document)
    console.log('🔥 Testing Firestore write access...');
    const testDocRef = doc(db, 'test_connection', 'test_doc');
    await setDoc(testDocRef, {
      timestamp: new Date().toISOString(),
      test: 'Firebase connection working'
    });
    console.log('✅ Firestore write successful');
    
    return {
      success: true,
      message: 'Firebase connection successful'
    };
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
}

export async function listWebUsers() {
  try {
    console.log('🔥 Listing all web_users...');
    const usersRef = collection(db, 'web_users');
    const snapshot = await getDocs(usersRef);
    
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));
    
    console.log('📋 Found web_users:', users);
    return users;
  } catch (error) {
    console.error('❌ Error listing web_users:', error);
    return [];
  }
}
