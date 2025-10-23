export type WebUserRole = 'admin' | 'seller';

export type WebUserPermissions = {
  dashboard: boolean;
  bookings: boolean;
  confirmation: boolean;
  withdrawal: boolean;
  access: boolean;
  images: boolean;
  users: boolean;
  inventory: boolean;
  'seller-orders': boolean;
  'add-product': boolean; // New: Allow access to Add Product/Manage Product
};

export interface WebUserProfile {
  uid: string;
  email: string;
  name: string; // display name / username
  role: WebUserRole;
  permissions: WebUserPermissions;
  isActive: boolean;
  createdAt: number; // epoch millis
  lastLogin?: number; // epoch millis
}
