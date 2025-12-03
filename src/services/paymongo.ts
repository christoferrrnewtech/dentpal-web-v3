/**
 * PayMongo Wallet Transaction Service
 * 
 * NOTE: All PayMongo API operations are proxied through Cloud Functions for security.
 * The secret key is never exposed to the frontend.
 * - Write operations (sending money): processWithdrawal Cloud Function
 * - Read operations (checking status): getPaymongoTransaction, listPaymongoTransactions Cloud Functions
 */

import { auth } from '@/lib/firebase';

// PayMongo Wallet Transaction response type (read-only)
export interface PayMongoWalletTransaction {
  id: string;
  type: string;
  attributes: {
    amount: number;
    balance_transaction_id: string;
    currency: string;
    description: string;
    fee: number;
    net_amount: number;
    provider: string;
    reference_number: string;
    status: string;
    transfer_id: string;
    created_at: number;
    updated_at: number;
  };
}

// Cloud Functions base URL - using asia-southeast1 region
// Validate environment configuration to prevent malformed URLs
const initFunctionsBaseUrl = (): string | null => {
  // First, check for explicit functions URL override
  const explicitUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL;
  if (explicitUrl && typeof explicitUrl === 'string' && explicitUrl.trim()) {
    return explicitUrl.trim();
  }

  // Fall back to constructing URL from project ID
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (projectId && typeof projectId === 'string' && projectId.trim()) {
    return `https://asia-southeast1-${projectId.trim()}.cloudfunctions.net`;
  }

  // Configuration is missing - log error and return null
  console.error(
    'PayMongo service configuration error: Neither VITE_FIREBASE_FUNCTIONS_URL nor ' +
    'VITE_FIREBASE_PROJECT_ID is configured. PayMongo transaction operations will fail.'
  );
  return null;
};

const FUNCTIONS_BASE_URL = initFunctionsBaseUrl();

/**
 * Validates that the Functions URL is configured before making API calls
 */
const validateConfiguration = (): void => {
  if (!FUNCTIONS_BASE_URL) {
    throw new Error(
      'PayMongo service not configured: Missing VITE_FIREBASE_FUNCTIONS_URL or VITE_FIREBASE_PROJECT_ID environment variable'
    );
  }
};

/**
 * Get the current user's auth token for API calls
 */
const getAuthToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.getIdToken();
};

/**
 * Retrieve a specific wallet transaction via Cloud Function
 */
export const getWalletTransaction = async (
  transactionId: string
): Promise<{
  success: boolean;
  data?: PayMongoWalletTransaction;
  error?: string;
}> => {
  try {
    validateConfiguration();
    const token = await getAuthToken();

    const response = await fetch(
      `${FUNCTIONS_BASE_URL}/getPaymongoTransaction?transactionId=${encodeURIComponent(transactionId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to retrieve transaction' };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Error retrieving wallet transaction:', error);
    return { success: false, error: error.message || 'Failed to retrieve transaction' };
  }
};

/**
 * List wallet transactions via Cloud Function
 */
export const listWalletTransactions = async (
  limit: number = 10
): Promise<{
  success: boolean;
  data?: PayMongoWalletTransaction[];
  error?: string;
}> => {
  try {
    validateConfiguration();
    const token = await getAuthToken();

    const response = await fetch(
      `${FUNCTIONS_BASE_URL}/listPaymongoTransactions?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to list transactions' };
    }

    return { success: true, data: result.data || [] };
  } catch (error: any) {
    console.error('Error listing wallet transactions:', error);
    return { success: false, error: error.message || 'Failed to list transactions' };
  }
};

export default {
  getWalletTransaction,
  listWalletTransactions,
};
