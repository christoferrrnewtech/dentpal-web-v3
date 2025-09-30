// Fix user role script
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function fixUserRole() {
  try {
    // Replace with your actual user ID from Firebase Authentication
    const userId = 'YOUR_FIREBASE_USER_ID';
    
    await updateDoc(doc(db, 'web_users', userId), {
      role: 'admin', // Ensure this is exactly 'admin'
      permissions: {
        dashboard: true,
        bookings: true,
        confirmation: true,
        withdrawal: true,
        access: true,
        images: true,
        users: true
      }
    });
    
    console.log('✅ User role fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing user role:', error);
  }
}

fixUserRole();
