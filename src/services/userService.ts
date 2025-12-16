import {collection, getDocs, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc} from 'firebase/firestore';
import {db } from '@/lib/firebase';
import type {User } from '@/components/users/types';

const USERS_COLLECTION ='User';

function computeSellerApproval(raw: any): User['sellerApprovalStatus'] {
  const explicit = raw?.sellerApprovalStatus;
  if (explicit === 'pending' || explicit === 'approved' || explicit === 'not_requested' || explicit === 'rejected') return explicit;
  // Heuristics based on common fields
  if (raw?.role === 'seller' || raw?.isSeller === true || raw?.sellerApproved === true) return 'approved';
  if (raw?.sellerRequestStatus === 'rejected' || raw?.sellerRejected === true) return 'rejected';
  if (
    raw?.requestedRole === 'seller' ||
    raw?.sellerRequest === true ||
    raw?.sellerApprovalPending === true ||
    raw?.sellerRequestStatus === 'pending'
  ) return 'pending';
  return 'not_requested';
}

interface UserAddressData {
  city?: string;
  cityName?: string;
  state?: string;
  province?: string;
  provinceCode?: string;
  isDefault?: boolean;
  addressLine1?: string;
  addressLine2?: string;
  country?: string;
  postalCode?: string;
}

async function fetchUserAddresses(userId: string): Promise<UserAddressData[]> {
  try {
    const addrCol = collection(doc(db, USERS_COLLECTION, userId), 'Address');
    const snap = await getDocs(addrCol);
    console.log(`[fetchUserAddresses] User ${userId}: Found ${snap.docs.length} addresses`);
    
    const addresses = snap.docs.map(d => {
      const data = d.data() as any;
      console.log(`[fetchUserAddresses] Address data for ${userId}:`, {
        city: data?.city,
        state: data?.state,
        province: data?.province,
        provinceCode: data?.provinceCode,
        isDefault: data?.isDefault
      });
      return {
        city: data?.city || data?.cityName,
        state: data?.state, // "Metro Manila", etc.
        province: data?.province,
        provinceCode: data?.provinceCode,
        isDefault: data?.isDefault === true,
        addressLine1: data?.addressLine1,
        addressLine2: data?.addressLine2,
        country: data?.country,
        postalCode: data?.postalCode
      };
    });
    return addresses;
  } catch (e) {
    console.warn('Failed to fetch Address subcollection for user', userId, e);
    return [];
  }
}

export async function fetchUsers(): Promise<User []> {
  // Use createdAt based on Firestore screenshot; fallback to unsorted if field missing at runtime.
  const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const base = snap.docs.map(d=> ({ id: d.id, ...(d.data() as any) }));
  const withAddresses = await Promise.all(
    base.map(async (raw: any) => {
      const shippingAddresses = await fetchUserAddresses(raw.id);
      const user: User = {
        id: raw.id,
        accountId: raw.accountId ?? raw.uid ?? raw.id,
        firstName: raw.firstName ?? '',
        middleName: raw.middleName,
        lastName: raw.lastName ?? '',
        email: raw.email ?? '',
        contactNumber: raw.contactNumber ?? '',
        shippingAddresses,
        specialty: raw.specialty ?? '',
        totalTransactions: Number(raw.totalTransactions ?? 0),
        totalSpent: Number(raw.totalSpent ?? 0),
        registrationDate: (raw.registrationDate ?? raw.createdAt ?? '').toString(),
        lastActivity: (raw.lastActivity ?? raw.updatedAt ?? '').toString(),
        status: (raw.status ?? 'active') as User['status'],
        rewardPoints: Number(raw.rewardPoints ?? 0),
        membershipLevel: (raw.membershipLevel ?? 'bronze') as User['membershipLevel'],
        profileComplete: Boolean(raw.profileComplete ?? false),
        sellerApprovalStatus: computeSellerApproval(raw),
      };
      return user;
    })
  );
  return withAddresses;
}

export function listenUsers(onChange: (users: User[]) => void) {
  const q = query(collection(db,USERS_COLLECTION), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(
    q,
    async snap => {
      const base = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const users = await Promise.all(
        base.map(async (raw: any) => {
          const shippingAddresses = await fetchUserAddresses(raw.id);
          const user: User = {
            id: raw.id,
            accountId: raw.accountId ?? raw.uid ?? raw.id,
            firstName: raw.firstName ?? '',
            middleName: raw.middleName,
            lastName: raw.lastName ?? '',
            email: raw.email ?? '',
            contactNumber: raw.contactNumber ?? '',
            shippingAddresses,
            specialty: raw.specialty ?? '',
            totalTransactions: Number(raw.totalTransactions ?? 0),
            totalSpent: Number(raw.totalSpent ?? 0),
            registrationDate: (raw.registrationDate ?? raw.createdAt ?? '').toString(),
            lastActivity: (raw.lastActivity ?? raw.updatedAt ?? '').toString(),
            status: (raw.status ?? 'active') as User['status'],
            rewardPoints: Number(raw.rewardPoints ?? 0),
            membershipLevel: (raw.membershipLevel ?? 'bronze') as User['membershipLevel'],
            profileComplete: Boolean(raw.profileComplete ?? false),
            sellerApprovalStatus: computeSellerApproval(raw),
          };
          return user;
        })
      );
      onChange(users);
    },
    err => console.error('Failed to listen to users', err)
  );
  return unsub;
}

export async function updateUserRewardPoints(userId: string, points: number) {
  const ref =doc(db, USERS_COLLECTION, userId);
  await updateDoc(ref, { rewardPoints: points });
}

export async function updateUserSellerApproval(userId: string, status: User['sellerApprovalStatus']) {
  const ref = doc(db, USERS_COLLECTION, userId);
  await updateDoc(ref, { sellerApprovalStatus: status });
}

export async function deleteUser(userId: string) {
  const ref = doc(db, USERS_COLLECTION, userId);
  await deleteDoc(ref);
}