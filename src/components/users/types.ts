export interface User {
  id: string;
  accountId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  contactNumber: string;
  shippingAddresses: string[];
  specialty: string;
  totalTransactions: number;
  totalSpent: number;
  registrationDate: string;
  lastActivity: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  rewardPoints: number;
  membershipLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  profileComplete: boolean;
  // Seller request/approval workflow separate from account status
  sellerApprovalStatus: 'pending' | 'approved' | 'not_requested' | 'rejected';
}

export type Filters = { search: string; location: string; specialty: string; status: string };