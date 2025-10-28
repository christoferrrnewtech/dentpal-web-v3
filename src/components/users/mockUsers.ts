import { User } from "./types";

const mockUsers: User[] = [
  {
    id: '1',
    accountId: 'ACC-001234',
    firstName: 'Dr. Maria',
    middleName: 'Santos',
    lastName: 'Rodriguez',
    email: 'maria.rodriguez@dentalclinic.ph',
    contactNumber: '+63 917 123 4567',
    shippingAddresses: ['123 Rizal Street, Makati City, Metro Manila 1200'],
    specialty: 'General Dentistry',
    totalTransactions: 145,
    totalSpent: 2850000,
    registrationDate: '2023-01-15',
    lastActivity: '2024-09-09',
    status: 'active',
    rewardPoints: 2850,
    membershipLevel: 'gold',
    profileComplete: true,
  },
  {
    id: '2',
    accountId: 'ACC-002345',
    firstName: 'Dr. Juan',
    lastName: 'Dela Cruz',
    email: 'juan.delacruz@orthodontics.ph',
    contactNumber: '+63 918 234 5678',
    shippingAddresses: ['789 Ortigas Avenue, Pasig City, Metro Manila 1600'],
    specialty: 'Orthodontics',
    totalTransactions: 89,
    totalSpent: 1750000,
    registrationDate: '2023-03-22',
    lastActivity: '2024-09-08',
    status: 'active',
    rewardPoints: 1750,
    membershipLevel: 'silver',
    profileComplete: true,
  }
];

export default mockUsers;
