// 🔥 Pure Firebase Authentication Service - No Express.js Backend Needed!
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  UserCredential,
  AuthError
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection,
  getDocs,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// User Profile Interface
export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'dentist' | 'staff';
  createdAt: Date;
  isActive: boolean;
  phone?: string;
  avatar?: string;
}

// 🚀 Direct Firebase Authentication - No API Layer Required
export class AuthService {
  
  // ✅ Login directly to Firebase
  static async login(email: string, password: string) {
    try {
      console.log('🔐 Authenticating with Firebase...', { email, password });
      console.log('🔥 Firebase config:', { projectId: auth.app.options.projectId });
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user profile directly from Firestore (web-specific collection)
      const userDoc = await getDoc(doc(db, 'web_users', user.uid));
      
      if (!userDoc.exists()) {
        // Create profile if doesn't exist (for default admin)
        const defaultProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          name: email.toLowerCase() === 'admin@gmail.com' ? 'Admin User' : 'User',
          role: email.toLowerCase() === 'admin@gmail.com' ? 'admin' : 'user',
          createdAt: new Date(),
          isActive: true
        };
        
        await setDoc(doc(db, 'web_users', user.uid), defaultProfile);
        
        return {
          user,
          profile: defaultProfile,
          success: true,
          message: 'Login successful!'
        };
      }
      
      const profile = userDoc.data() as UserProfile;
      
      if (!profile.isActive) {
        throw new Error('Account is deactivated');
      }
      
      console.log('✅ Login successful:', user.email);
      return {
        user,
        profile,
        success: true,
        message: 'Welcome back!'
      };
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      throw new Error(AuthService.getAuthErrorMessage(error));
    }
  }
  
  // ✅ Register directly to Firebase  
  static async register(
    email: string, 
    password: string, 
    name: string, 
    role: 'admin' | 'user' | 'dentist' | 'staff' = 'user'
  ) {
    try {
      console.log('📝 Creating new user...');
      
      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user profile directly in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email,
        name,
        role,
        createdAt: new Date(),
        isActive: true
      };
      
      await setDoc(doc(db, 'web_users', user.uid), userProfile);
      
      console.log('✅ User created successfully:', email);
      return {
        user,
        profile: userProfile,
        success: true,
        message: 'Account created successfully!'
      };
      
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      throw new Error(AuthService.getAuthErrorMessage(error));
    }
  }
  
  // ✅ Logout from Firebase
  static async logout() {
    try {
      await firebaseSignOut(auth);
      console.log('✅ Logout successful');
      return { 
        success: true, 
        message: 'Logged out successfully' 
      };
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      throw new Error('Logout failed');
    }
  }
  
  // ✅ Listen to Firebase auth state changes
  static onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
  
  // ✅ Get current user profile from Firestore
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'web_users', user.uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
  
  // ✅ Update user profile in Firestore
  static async updateUserProfile(uid: string, updates: Partial<UserProfile>) {
    try {
      await updateDoc(doc(db, 'web_users', uid), updates);
      return { 
        success: true, 
        message: 'Profile updated successfully' 
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile');
    }
  }
  
  // ✅ Create default admin user (runs on app start)
  static async ensureDefaultAdmin() {
    try {
      // Check if admin already exists in Firestore
      const adminQuery = query(
        collection(db, 'web_users'),
        where('email', '==', 'admin@gmail.com')
      );
      const adminSnapshot = await getDocs(adminQuery);
      
      if (!adminSnapshot.empty) {
        console.log('✅ Default admin already exists');
        return;
      }
      
      console.log('🔧 Creating default admin user...');
      
      // Create admin user
      console.log('🔧 Creating admin with credentials:', { email: 'admin@gmail.com', password: 'DentpalAccess' });
      await this.register(
        'admin@gmail.com',
        'DentpalAccess',
        'Admin User',
        'admin'
      );
      
      console.log('✅ Default admin user created successfully!');
      
    } catch (error: any) {
      // Don't throw error if admin already exists in Firebase Auth
      if (error.message.includes('email-already-in-use')) {
        console.log('✅ Admin user already exists in Firebase Auth');
        return;
      }
      console.error('⚠️  Could not create default admin:', error.message);
    }
  }
  
  // 🛠️ Helper: Convert Firebase auth errors to user-friendly messages
  static getAuthErrorMessage(error: AuthError | Error): string {
    if ('code' in error) {
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          return 'Invalid email or password';
        case 'auth/email-already-in-use':
          return 'Email already in use';
        case 'auth/weak-password':
          return 'Password should be at least 6 characters';
        case 'auth/invalid-email':
          return 'Invalid email address';
        case 'auth/too-many-requests':
          return 'Too many failed attempts. Please try again later';
        case 'auth/network-request-failed':
          return 'Network error. Please check your connection';
        default:
          return error.message || 'Authentication failed';
      }
    }
    return error.message || 'Authentication failed';
  }
}

// 📤 Export individual functions for easier importing (backward compatibility)
export const loginUser = AuthService.login;
export const registerUser = AuthService.register;
export const signOut = AuthService.logout;
export const onAuthStateChange = AuthService.onAuthStateChange;
export const getCurrentUserProfile = AuthService.getCurrentUserProfile;
export const updateUserProfile = AuthService.updateUserProfile;
export const initializeDefaultAdmin = AuthService.ensureDefaultAdmin;

// 🔐 Export Firebase auth instance for direct access if needed
export { auth } from '../lib/firebase';

// � Debug: Clear any existing auth state and start fresh
auth.signOut().then(() => {
  console.log('🧹 Cleared any existing Firebase auth state');
  // �🚀 Initialize default admin on app start
  AuthService.ensureDefaultAdmin();
}).catch(err => {
  console.log('🔧 No existing auth to clear, proceeding...');
  // 🚀 Initialize default admin on app start  
  AuthService.ensureDefaultAdmin();
});
