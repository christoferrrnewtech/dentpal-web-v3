import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WebUserPermissions, WebUserRole, WebUserProfile } from '@/types/webUser';

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
    inventory: true,
    'seller-orders': true,
    'add-product': true,
  },
  seller: {
    dashboard: true,
    bookings: true,
    confirmation: false,
    withdrawal: false,
    access: false,
    images: false,
    users: false,
    inventory: false,
    'seller-orders': true,
    'add-product': true,
  }
};

export type Permission = keyof WebUserPermissions;

interface UseAuthResult {
  role: WebUserRole | null;
  permissions: WebUserPermissions | null;
  uid: string | null;
  isAdmin: boolean;
  isSeller: boolean;
  isSubAccount: boolean;
  parentId?: string | null;
  hasPermission: (permission: Permission) => boolean;
  loading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthResult {
  const [role, setRole] = useState<WebUserRole | null>(null);
  const [permissions, setPermissions] = useState<WebUserPermissions | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [isSubAccount, setIsSubAccount] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (!user) {
          setRole(null);
          setPermissions(null);
          setUid(null);
          setIsSubAccount(false);
          setParentId(null);
          setLoading(false);
          return;
        }

        setUid(user.uid);

        // Prefer Seller collection; fallback to legacy web_users
        let userData: Partial<WebUserProfile> | null = null;
        let snap = await getDoc(doc(db, 'Seller', user.uid));
        if (snap.exists()) userData = snap.data() as any;
        if (!userData) {
          snap = await getDoc(doc(db, 'web_users', user.uid));
          if (snap.exists()) userData = snap.data() as any;
        }

        if (userData) {
          if (userData.isActive === false) {
            setRole(null);
            setPermissions(null);
            setError('Your account has been disabled');
          } else {
            setRole((userData.role as WebUserRole) || 'seller');
            setPermissions((userData.permissions as WebUserPermissions) || null);
            setIsSubAccount(!!userData.isSubAccount);
            setParentId((userData.parentId as string) || null);
          }
        } else {
          console.warn(`No user document found for uid ${user.uid}`);
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

    // Sub-accounts cannot open Access or create/manage other users
    if (isSubAccount && (permission === 'access' || permission === 'users')) return false;

    if (permissions && permission in permissions) {
      return (permissions as any)[permission];
    }

    return PERMISSIONS_BY_ROLE[role][permission] || false;
  };

  return {
    role,
    permissions,
    uid,
    isAdmin: role === 'admin',
    isSeller: role === 'seller',
    isSubAccount,
    parentId,
    hasPermission,
    loading,
    error
  };
}
