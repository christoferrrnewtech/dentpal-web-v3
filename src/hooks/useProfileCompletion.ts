import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

export type ProfileIssue = {
  id: string;
  label: string;
};

export function useProfileCompletion() {
  const { uid, isSeller } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!uid) { setProfile(null); return; }
      setLoading(true);
      try {
        // Prefer Seller doc (new), fallback to legacy web_users
        const sellerSnap = await getDoc(doc(db, 'Seller', uid));
        if (sellerSnap.exists()) {
          if (mounted) setProfile({ ...sellerSnap.data(), source: 'Seller' });
        } else {
          const snap = await getDoc(doc(db, 'web_users', uid));
          if (mounted) setProfile(snap.exists() ? { ...snap.data(), source: 'web_users' } : null);
        }
      } catch (e) {
        console.error('Failed to load profile for completion check', e);
        if (mounted) setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [uid]);

  const { percent, isComplete, issues, vendorProfileComplete } = useMemo(() => {
    if (!profile) {
      return { percent: 0, isComplete: false, vendorProfileComplete: false, issues: [{ id: 'profile', label: 'Set up your profile' }] as ProfileIssue[] };
    }

    // New: vendor profile completion driven by Seller.vendor.requirements.profileCompleted
    const vendor = (profile as any).vendor || {};
    const vendorComplete = vendor?.requirements?.profileCompleted === true;
    const vendorProfileComplete = vendorComplete;

    // If backend explicitly flags completion
    const explicitComplete = (profile as any).profileComplete === true || vendorComplete;

    const name = (profile.name || '').trim?.() || '';
    const phone = (profile.phone || '').trim?.() || '';
    const avatar = (profile.avatar || '').trim?.() || '';

    const weights = { name: 30, phone: 30, avatar: 10, vendor: 30 };

    let score = 0;
    const issues: ProfileIssue[] = [];

    if (name) score += weights.name; else issues.push({ id: 'name', label: 'Add your display name' });
    if (phone) score += weights.phone; else issues.push({ id: 'phone', label: 'Add your mobile number' });
    if (avatar) score += weights.avatar; else issues.push({ id: 'avatar', label: 'Upload your profile photo' });

    if (isSeller) {
      if (vendorComplete) score += weights.vendor; else issues.push({ id: 'vendor', label: 'Complete vendor enrollment' });
    }

    const percent = Math.min(100, Math.round(score));
    return { percent, isComplete: percent >= 100, vendorProfileComplete, issues };
  }, [profile, isSeller]);

  return {
    loading,
    profile,
    percent,
    isComplete,
    vendorProfileComplete,
    issues,
  };
}
