import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  DocumentReference
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { WebUserProfile, WebUserPermissions, WebUserRole } from '@/types/webUser';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

// Collection reference
const WEB_USERS_COLLECTION = 'web_users';

/**
 * Fetch web users from Firestore, optionally filtered by role
 */
export async function getWebUsers(roles?: WebUserRole[]): Promise<WebUserProfile[]> {
  try {
    // Use simple query to avoid index requirements
    const q = query(collection(db, WEB_USERS_COLLECTION));
    const querySnapshot = await getDocs(q);
    const users: WebUserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data() as Omit<WebUserProfile, 'uid'>;
      const user = {
        uid: doc.id,
        ...userData
      };
      
      // Filter by roles if specified
      if (!roles || roles.length === 0 || roles.includes(user.role)) {
        users.push(user);
      }
    });
    
    // Sort by creation date (newest first)
    return users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.error("Error fetching web users:", error);
    throw new Error("Failed to fetch users");
  }
}

/**
 * Get a single web user by uid
 */
export async function getWebUser(uid: string): Promise<WebUserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, WEB_USERS_COLLECTION, uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as Omit<WebUserProfile, 'uid'>;
      return {
        uid: userDoc.id,
        ...userData
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching web user:", error);
    throw new Error("Failed to fetch user");
  }
}

/**
 * Create a new web user with authentication and Firestore profile
 */
export async function createWebUser(email: string, name: string, role: WebUserRole, permissions: WebUserPermissions): Promise<WebUserProfile> {
  try {
    console.log('🔥 Starting user creation process for:', email);
    
    // Generate a random password that meets Firebase requirements
    // Must contain: uppercase, lowercase, number, and special character
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}#${Math.floor(Math.random() * 100)}`;
    console.log('🔥 Generated temp password (meets requirements), attempting to create auth user...');
    
    // Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
    const { user } = userCredential;
    console.log('✅ Firebase Auth user created successfully:', user.uid);
    
    // Create user profile in Firestore
    const userData: Omit<WebUserProfile, 'uid'> = {
      email,
      name,
      role,
      permissions,
      isActive: true,
      createdAt: Date.now(),
    };
    
    console.log('🔥 Creating Firestore document with data:', userData);
    console.log('🔥 Document path: web_users/' + user.uid);
    
    // Add to web_users collection with UID as document ID
    await setDoc(doc(db, WEB_USERS_COLLECTION, user.uid), userData);
    console.log('✅ Firestore document created successfully');
    
    // Send password reset email so the user can set their own password
    // This will send a Firebase-generated email with a password reset link
    console.log('🔥 Attempting to send password reset email to:', email);
    
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/auth`, // Redirect after password reset
        handleCodeInApp: true
      });
      console.log(`✅ Password setup email sent successfully to ${email}`);
    } catch (emailError) {
      // If email fails, still return success but log the issue
      console.warn('⚠️ Failed to send email, but user was created:', emailError);
      console.log('💡 User can still log in with temp password or admin can resend invite');
    }
    
    return {
      uid: user.uid,
      ...userData
    };
  } catch (error) {
    console.error("❌ Error creating web user:", error);
    console.error("❌ Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error; // Re-throw the original error for better debugging
  }
}

/**
 * Update a web user's role and permissions
 */
export async function updateWebUserAccess(uid: string, role: WebUserRole, permissions: WebUserPermissions): Promise<boolean> {
  try {
    const userRef = doc(db, WEB_USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      role,
      permissions
    });
    
    return true;
  } catch (error) {
    console.error("Error updating web user access:", error);
    throw new Error("Failed to update user access");
  }
}

/**
 * Enable or disable a web user
 */
export async function setWebUserStatus(uid: string, isActive: boolean): Promise<boolean> {
  try {
    const userRef = doc(db, WEB_USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      isActive
    });
    
    return true;
  } catch (error) {
    console.error("Error updating web user status:", error);
    throw new Error("Failed to update user status");
  }
}

/**
 * Update a user's profile information (name, etc.)
 */
export async function updateWebUserProfile(
  uid: string, 
  profileData: Partial<Omit<WebUserProfile, 'uid' | 'email' | 'role' | 'permissions' | 'isActive' | 'createdAt'>>
): Promise<boolean> {
  try {
    const userRef = doc(db, WEB_USERS_COLLECTION, uid);
    await updateDoc(userRef, profileData);
    
    return true;
  } catch (error) {
    console.error("Error updating web user profile:", error);
    throw new Error("Failed to update user profile");
  }
}

/**
 * Resend invitation email to a user
 */
export async function resendUserInvite(email: string): Promise<boolean> {
  try {
    // Send password reset email with custom action URL
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/auth`,
      handleCodeInApp: true
    });
    
    console.log(`Invitation email resent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error resending user invite:", error);
    throw new Error("Failed to resend invitation");
  }
}
