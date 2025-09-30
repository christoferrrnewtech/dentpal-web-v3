// Account recovery tool
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './src/lib/firebase';

// 1. Check if user profile exists in Firestore
async function checkUserProfile(email) {
  console.log(`Checking if profile exists for ${email}...`);
  
  try {
    // Query the web_users collection by email
    const snapshot = await db.collection('web_users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      console.log(`✅ User profile found in Firestore: ${userDoc.id}`);
      console.log(userDoc.data());
      return { exists: true, uid: userDoc.id, data: userDoc.data() };
    } else {
      console.log(`❌ No user profile found for ${email}`);
      return { exists: false };
    }
  } catch (error) {
    console.error('Error checking user profile:', error);
    return { exists: false, error };
  }
}

// 2. Reset password
async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log(`✅ Password reset email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset:', error);
    return { success: false, error };
  }
}

// 3. Create auth user + link to existing profile
async function createAuthUser(email, password, uid) {
  try {
    // Create Firebase Authentication user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log(`✅ Auth user created: ${user.uid}`);
    
    // If we have a specific UID to link to
    if (uid && user.uid !== uid) {
      console.log(`⚠️ New auth user ID (${user.uid}) doesn't match existing profile ID (${uid})`);
      // Would need admin SDK to fix this mismatch
    }
    
    return { success: true, uid: user.uid };
  } catch (error) {
    console.error('Error creating auth user:', error);
    return { success: false, error };
  }
}

// Choose which function to run:
// 1. Reset password: Uncomment this line to send password reset email
// resetPassword('tofer.rrnewtech@gmail.com');

// 2. Create auth user: Uncomment this line to create a new authentication user
// createAuthUser('tofer.rrnewtech@gmail.com', 'NewPassword123', null);

// 3. Check profile: Uncomment this line to check if the user profile exists in Firestore
// checkUserProfile('tofer.rrnewtech@gmail.com');
