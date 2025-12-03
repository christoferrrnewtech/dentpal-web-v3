/**
 * Withdrawal Service
 * Handles all Firestore operations for the 'Withdrawal' collection
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  WithdrawalRequest,
  WithdrawalStatus,
  CreateWithdrawalInput,
  BankAccount,
  generateReferenceNumber,
} from '@/types/withdrawal';

const COLLECTION_NAME = 'Withdrawal';

/**
 * Generate a unique reference number for tracking
 */
const generateRefNumber = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Create a new withdrawal request (called by seller)
 */
export const createWithdrawalRequest = async (
  sellerId: string,
  sellerName: string,
  sellerEmail: string,
  input: CreateWithdrawalInput
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const now = new Date().toISOString();
    const referenceNumber = generateRefNumber();

    const withdrawalData: Omit<WithdrawalRequest, 'id'> = {
      // Seller Information
      sellerId,
      sellerName,
      sellerEmail,

      // Request Details
      amount: input.amount,
      currency: 'PHP',
      description: input.description || null,

      // Bank Account (Receiver)
      receiver: {
        bankAccountName: input.receiver.bankAccountName,
        bankAccountNumber: input.receiver.bankAccountNumber,
        bankCode: input.receiver.bankCode,
        bankId: input.receiver.bankId || null,
        bankName: input.receiver.bankName,
      },

      // Status & Tracking
      status: 'pending',
      referenceNumber,

      // Timestamps
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), withdrawalData);

    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error creating withdrawal request:', error);
    return { success: false, error: error.message || 'Failed to create withdrawal request' };
  }
};

/**
 * Get all withdrawal requests for a specific seller
 */
export const getSellerWithdrawalRequests = async (
  sellerId: string
): Promise<WithdrawalRequest[]> => {
  try {
    console.log('Fetching withdrawal requests for sellerId:', sellerId);
    
    // First try with ordering (requires composite index)
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('sellerId', '==', sellerId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      console.log('Found withdrawal requests:', snapshot.docs.length);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WithdrawalRequest[];
    } catch (indexError: any) {
      // If composite index doesn't exist, fall back to simple query and sort in memory
      console.warn('Composite index not available, using fallback query:', indexError.message);
      
      const q = query(
        collection(db, COLLECTION_NAME),
        where('sellerId', '==', sellerId)
      );

      const snapshot = await getDocs(q);
      console.log('Found withdrawal requests (fallback):', snapshot.docs.length);
      
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WithdrawalRequest[];
      
      // Sort by createdAt in memory
      return requests.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // descending
      });
    }
  } catch (error) {
    console.error('Error fetching seller withdrawal requests:', error);
    return [];
  }
};

/**
 * Get all withdrawal requests (for admin)
 */
export const getAllWithdrawalRequests = async (): Promise<WithdrawalRequest[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WithdrawalRequest[];
  } catch (error) {
    console.error('Error fetching all withdrawal requests:', error);
    return [];
  }
};

/**
 * Get withdrawal requests by status (for admin filtering)
 */
export const getWithdrawalRequestsByStatus = async (
  status: WithdrawalStatus
): Promise<WithdrawalRequest[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WithdrawalRequest[];
  } catch (error) {
    console.error('Error fetching withdrawal requests by status:', error);
    return [];
  }
};

/**
 * Get a single withdrawal request by ID
 */
export const getWithdrawalRequestById = async (
  withdrawalId: string
): Promise<WithdrawalRequest | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, withdrawalId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as WithdrawalRequest;
  } catch (error) {
    console.error('Error fetching withdrawal request:', error);
    return null;
  }
};

/**
 * Approve a withdrawal request (admin action)
 */
export const approveWithdrawalRequest = async (
  withdrawalId: string,
  adminUid: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, withdrawalId);
    const now = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(docRef);
      
      if (!snapshot.exists()) {
        throw new Error('Withdrawal request not found');
      }

      const data = snapshot.data();
      if (data.status !== 'pending') {
        throw new Error(`Cannot approve request with status: ${data.status}`);
      }

      transaction.update(docRef, {
        status: 'approved',
        approvedBy: adminUid,
        approvedAt: now,
        updatedAt: now,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error approving withdrawal request:', error);
    return { success: false, error: error.message || 'Failed to approve withdrawal request' };
  }
};

/**
 * Reject a withdrawal request (admin action)
 */
export const rejectWithdrawalRequest = async (
  withdrawalId: string,
  adminUid: string,
  reason: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, withdrawalId);
    const now = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(docRef);
      
      if (!snapshot.exists()) {
        throw new Error('Withdrawal request not found');
      }

      const data = snapshot.data();
      if (data.status !== 'pending') {
        throw new Error(`Cannot reject request with status: ${data.status}`);
      }

      transaction.update(docRef, {
        status: 'rejected',
        rejectedBy: adminUid,
        rejectedAt: now,
        rejectionReason: reason,
        updatedAt: now,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting withdrawal request:', error);
    return { success: false, error: error.message || 'Failed to reject withdrawal request' };
  }
};

/**
 * Update withdrawal status to processing (after PayMongo transfer is initiated)
 */
export const markWithdrawalProcessing = async (
  withdrawalId: string,
  paymongoData: {
    transactionId: string;
    transferId: string;
    provider: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, withdrawalId);
    const now = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(docRef);
      if (!snapshot.exists()) {
        throw new Error('Withdrawal request not found');
      }
      const data = snapshot.data();
      if (data.status !== 'approved') {
        throw new Error(`Cannot process request with status: ${data.status}`);
      }
      transaction.update(docRef, {
        status: 'processing',
        paymongoTransactionId: paymongoData.transactionId,
        paymongoTransferId: paymongoData.transferId,
        provider: paymongoData.provider,
        updatedAt: now,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error marking withdrawal as processing:', error);
    return { success: false, error: error.message || 'Failed to update withdrawal status' };
  }
};
/**
 * Mark withdrawal as completed (after successful transfer)
 * Uses a transaction to ensure only 'processing' withdrawals can be completed.
 */
export const markWithdrawalCompleted = async (
  withdrawalId: string,
  netAmount: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, withdrawalId);

    await runTransaction(db, async (transaction) => {
      const withdrawalSnap = await transaction.get(docRef);
      if (!withdrawalSnap.exists()) {
        throw new Error('Withdrawal document does not exist');
      }
      const withdrawalData = withdrawalSnap.data();
      if (withdrawalData.status !== 'processing') {
        throw new Error(
          `Cannot mark withdrawal as completed: current status is '${withdrawalData.status}', expected 'processing'`
        );
      }
      const now = new Date().toISOString();
      transaction.update(docRef, {
        status: 'completed',
        netAmount,
        completedAt: now,
        updatedAt: now,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error marking withdrawal as completed:', error);
    return { success: false, error: error.message || 'Failed to complete withdrawal' };
  }
};

/**
 * Mark withdrawal as failed (after transfer error)
 * Uses a transaction to ensure only 'approved' or 'processing' withdrawals can be marked as failed.
 */
export const markWithdrawalFailed = async (
  withdrawalId: string,
  providerError: string,
  providerErrorCode: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, withdrawalId);

    await runTransaction(db, async (transaction) => {
      const withdrawalSnap = await transaction.get(docRef);
      if (!withdrawalSnap.exists()) {
        throw new Error('Withdrawal document does not exist');
      }
      const withdrawalData = withdrawalSnap.data();
      const allowedStatuses = ['approved', 'processing'];
      if (!allowedStatuses.includes(withdrawalData.status)) {
        throw new Error(`invalid status: ${withdrawalData.status}`);
      }
      const now = new Date().toISOString();
      transaction.update(docRef, {
        status: 'failed',
        providerError,
        providerErrorCode,
        updatedAt: now,
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error marking withdrawal as failed:', error);
    return { success: false, error: error.message || 'Failed to update withdrawal status' };
  }
};

/**
 * Get pending withdrawal count (for admin dashboard badge)
 */
export const getPendingWithdrawalCount = async (): Promise<number> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error counting pending withdrawals:', error);
    return 0;
  }
};

/**
 * Process a withdrawal via PayMongo (calls Firebase Cloud Function)
 * This initiates the actual bank transfer after admin approval
 */
export const processWithdrawalViaPayMongo = async (
  withdrawalId: string,
  authToken: string
): Promise<{ 
  success: boolean; 
  error?: string;
  transaction?: {
    id: string;
    status: string;
    provider: string;
    amount: number;
    netAmount: number;
    referenceNumber: string;
  };
}> => {
  try {
    // Get the Firebase Functions URL - adjust based on your project
    const functionsBaseUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 
      'https://us-central1-dentpal-161e5.cloudfunctions.net';

    const response = await fetch(`${functionsBaseUrl}/processWithdrawal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ withdrawalId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to process withdrawal');
    }

    return {
      success: true,
      transaction: data.transaction,
    };
  } catch (error: any) {
    console.error('Error processing withdrawal via PayMongo:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to process withdrawal' 
    };
  }
};

/**
 * Check withdrawal status from PayMongo (calls Firebase Cloud Function)
 */
export const checkWithdrawalStatusFromPayMongo = async (
  withdrawalId: string,
  authToken: string
): Promise<{
  success: boolean;
  error?: string;
  withdrawalStatus?: string;
  transaction?: {
    id: string;
    status: string;
    provider: string;
    providerError?: string;
    amount: number;
    netAmount: number;
    referenceNumber: string;
  };
}> => {
  try {
    const functionsBaseUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 
      'https://us-central1-dentpal-161e5.cloudfunctions.net';

    const response = await fetch(`${functionsBaseUrl}/checkWithdrawalStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ withdrawalId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to check withdrawal status');
    }

    return {
      success: true,
      withdrawalStatus: data.withdrawalStatus,
      transaction: data.transaction,
    };
  } catch (error: any) {
    console.error('Error checking withdrawal status:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to check withdrawal status' 
    };
  }
};

export default {
  createWithdrawalRequest,
  getSellerWithdrawalRequests,
  getAllWithdrawalRequests,
  getWithdrawalRequestsByStatus,
  getWithdrawalRequestById,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  markWithdrawalProcessing,
  markWithdrawalCompleted,
  markWithdrawalFailed,
  getPendingWithdrawalCount,
  processWithdrawalViaPayMongo,
  checkWithdrawalStatusFromPayMongo,
};
