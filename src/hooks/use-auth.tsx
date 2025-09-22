import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WebUserPermissions, WebUserRole } from '@/types/webUser';

/**
 * Permission map defining what each role can do by default
 * These align with the database permission names
 */
export const PERMISSIONS_BY_ROLE: Record<WebUserRole, WebUserPermissions> = {
  admin: {
    dashboard: true,
    bookings: true,
    confirmation: true,
    withdrawal: true,
    access: true,
    images: true,
    users: true,
  },
  seller: {
    dashboard: true,
    bookings: true,
    confirmation: false,
    withdrawal: false,
    access: false,
    images: false,
    users: false,
  }
};

export type Permission = keyof WebUserPermissions;

interface UseAuthResult {
  role: WebUserRole | null;
  permissions: WebUserPermissions | null;
  uid: string | null;
  isAdmin: boolean;
  isSeller: boolean;
  hasPermission: (permission: Permission) => boolean;
  loading: boolean;
  error: string | null;
}

/**
 * A hook to check if the current user has the specified permission
 */
export function useAuth(): UseAuthResult {
  const [role, setRole] = useState<WebUserRole | null>(null);
  const [permissions, setPermissions] = useState<WebUserPermissions | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (!user) {
          // Not logged in
          setRole(null);
          setPermissions(null);
          setUid(null);
          setLoading(false);
          return;
        }

        // Set uid early so we know the user is authenticated
        setUid(user.uid);
        
        // Since we don't have Cloud Functions yet to set custom claims,
        // we'll read directly from the web_users collection
        const userDoc = await getDoc(doc(db, 'web_users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          if (userData.isActive === false) {
            // User is disabled
            setRole(null);
            setPermissions(null);
            setError('Your account has been disabled');
          } else {
            setRole(userData.role);
            setPermissions(userData.permissions || null);
          }
        } else {
          // No role found - this user might not be properly set up
          console.warn(`No web_users document found for uid ${user.uid}`);
          setRole(null);
          setPermissions(null);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error in auth hook:', err);
        setError('Failed to load user permissions');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Checks if the current user has the specified permission
   */
  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    
    // If user has explicit permissions, check those first
    if (permissions && permission in permissions) {
      return permissions[permission];
    }
    
    // Otherwise use the role-based permissions as fallback
    return PERMISSIONS_BY_ROLE[role][permission] || false;
  };

  return {
    role,
    permissions,
    uid,
    isAdmin: role === 'admin',
    isSeller: role === 'seller',
    hasPermission,
    loading,
    error
  };
}
