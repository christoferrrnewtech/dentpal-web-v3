// 🔥 Firebase Authentication Hook - Direct Firebase Integration
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  loginUser, 
  signOut, 
  onAuthStateChange, 
  getCurrentUserProfile, 
  initializeDefaultAdmin,
  UserProfile 
} from '@/services/auth';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null
  });

  // Initialize authentication state
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Initialize default admin if needed
        await initializeDefaultAdmin();
        
        // Set up auth state listener
        const unsubscribe = onAuthStateChange(async (user) => {
          if (!isMounted) return;

          console.log('🔍 Auth state changed:', { 
            userExists: !!user, 
            userEmail: user?.email,
            uid: user?.uid 
          });

          if (user) {
            // User is signed in, get their profile
            const profile = await getCurrentUserProfile();
            console.log('👤 User profile loaded:', { 
              profileExists: !!profile, 
              profileRole: profile?.role 
            });
            
            setAuthState({
              user,
              profile,
              loading: false,
              error: null
            });
          } else {
            // User is signed out
            console.log('🚪 User signed out');
            setAuthState({
              user: null,
              profile: null,
              loading: false,
              error: null
            });
          }
        });

        return () => {
          isMounted = false;
          unsubscribe();
        };
      } catch (error: any) {
        if (isMounted) {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            error: error.message
          });
        }
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    console.log('🔐 Login attempt:', { email, rememberMe });
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { user, profile } = await loginUser(email, password);
      console.log('✅ Login successful:', { 
        userEmail: user?.email, 
        profileRole: profile?.role 
      });
      
      // Handle "Remember Me" functionality
      if (rememberMe) {
        localStorage.setItem('dentpal_remember_email', email);
      } else {
        localStorage.removeItem('dentpal_remember_email');
      }
      
      // Set auth state immediately for better UX
      setAuthState({
        user,
        profile,
        loading: false,
        error: null
      });
      
      return { success: true, user, profile };
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    try {
      await signOut();
      
      // Clear remember me data on logout
      localStorage.removeItem('dentpal_remember_email');
      
      setAuthState({
        user: null,
        profile: null,
        loading: false,
        error: null
      });
      
      return { success: true };
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      
      return { success: false, error: error.message };
    }
  };

  // Get remembered email for "Remember Me" functionality
  const getRememberedEmail = () => {
    return localStorage.getItem('dentpal_remember_email') || '';
  };

  // Check if user is admin
  const isAdmin = () => {
    return authState.profile?.role === 'admin';
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!authState.user && !!authState.profile;
  };

  return {
    // State
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    error: authState.error,
    
    // Functions
    login,
    logout,
    getRememberedEmail,
    
    // Computed values
    isAdmin: isAdmin(),
    isAuthenticated: isAuthenticated(),
    
    // Clear error
    clearError: () => setAuthState(prev => ({ ...prev, error: null }))
  };
};
