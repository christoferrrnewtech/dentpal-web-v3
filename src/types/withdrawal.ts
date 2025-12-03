/**
 * Withdrawal Request Types
 * Based on PayMongo wallet transaction resource structure
 */

// Bank account details for receiver (seller)
export interface BankAccount {
  bankAccountName: string;
  bankAccountNumber: string;
  bankCode: string;
  bankId?: string;
  bankName: string;
}

// Withdrawal request status
export type WithdrawalStatus = 
  | 'pending'      // Seller submitted, waiting for admin approval
  | 'approved'     // Admin approved, ready for transfer
  | 'processing'   // Transfer initiated via PayMongo
  | 'completed'    // Transfer successful
  | 'rejected'     // Admin rejected the request
  | 'failed';      // Transfer failed (provider error)

// Main Withdrawal Request document stored in Firestore 'Withdrawal' collection
export interface WithdrawalRequest {
  // Document ID (auto-generated or custom)
  id?: string;
  
  // Seller Information
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  
  // Request Details
  amount: number;
  currency: string; // Default: 'PHP'
  description?: string;
  
  // Bank Account (Receiver)
  receiver: BankAccount;
  
  // Status & Tracking
  status: WithdrawalStatus;
  referenceNumber?: string; // Generated reference for tracking
  
  // PayMongo Integration (populated after transfer is initiated)
  paymongoTransactionId?: string; // wallet_tr_xxx
  paymongoTransferId?: string;    // tr_xxx
  provider?: string;              // 'pesonet' | 'instapay'
  providerError?: string;
  providerErrorCode?: string;
  netAmount?: number;
  
  // Admin Actions
  approvedBy?: string;    // Admin UID who approved
  approvedAt?: string;    // ISO timestamp
  rejectedBy?: string;    // Admin UID who rejected
  rejectedAt?: string;    // ISO timestamp
  rejectionReason?: string;
  
  // Timestamps
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
  completedAt?: string;   // ISO timestamp when transfer completed
}

// Input for creating a new withdrawal request (seller-facing)
export interface CreateWithdrawalInput {
  amount: number;
  receiver: BankAccount;
  description?: string;
}

// Input for admin actions
export interface ApproveWithdrawalInput {
  withdrawalId: string;
  adminUid: string;
}

export interface RejectWithdrawalInput {
  withdrawalId: string;
  adminUid: string;
  reason: string;
}

// Philippine banks list for dropdown selection
export const PHILIPPINE_BANKS = [
  { code: 'AUBKPHMM', id: '001', name: 'ASIA UNITED BANK' },
  { code: 'ABORPHMM', id: '002', name: 'BANK OF COMMERCE' },
  { code: 'BOPIPHMM', id: '003', name: 'BANK OF THE PHILIPPINE ISLANDS' },
  { code: 'BNORPHMM', id: '004', name: 'BDO UNIBANK INC' },
  { code: 'CHBKPHMM', id: '005', name: 'CHINA BANKING CORPORATION' },
  { code: 'CTABORPHMM', id: '006', name: 'CHINATRUST BANKING CORP' },
  { code: 'CITIPHMX', id: '007', name: 'CITIBANK' },
  { code: 'DBPHPHMM', id: '008', name: 'DEVELOPMENT BANK OF THE PHILIPPINES' },
  { code: 'EWBCPHMM', id: '009', name: 'EASTWEST BANK' },
  { code: 'GABORPHMXXX', id: '010', name: 'G-XCHANGE / GCASH' },
  { code: 'TLBPPHMM', id: '011', name: 'LANDBANK OF THE PHILIPPINES' },
  { code: 'MABORPHMM', id: '012', name: 'MAYA PHILIPPINES INC' },
  { code: 'MBTCPHMM', id: '013', name: 'METROBANK' },
  { code: 'PBORPHMM', id: '014', name: 'PHILIPPINE BANK OF COMMUNICATIONS' },
  { code: 'PNBMPHMM', id: '015', name: 'PHILIPPINE NATIONAL BANK' },
  { code: 'PHSBPHMM', id: '016', name: 'PHILIPPINE SAVINGS BANK' },
  { code: 'PHTBPHMM', id: '017', name: 'PHILIPPINE TRUST COMPANY' },
  { code: 'PHVBPHMM', id: '018', name: 'PHILIPPINE VETERANS BANK' },
  { code: 'RCBCPHMM', id: '019', name: 'RCBC' },
  { code: 'ROBPPHMM', id: '020', name: 'ROBINSONS BANK' },
  { code: 'SETCPHMM', id: '021', name: 'SECURITY BANK' },
  { code: 'UCPBPHMM', id: '022', name: 'UCPB' },
  { code: 'UBPHPHMM', id: '023', name: 'UNION BANK OF THE PHILIPPINES' },
] as const;

// Helper to generate a reference number
export const generateReferenceNumber = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
