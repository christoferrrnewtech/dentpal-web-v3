import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadString, 
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export type PolicyType = 'terms-of-service' | 'privacy-policy';
export type PolicyStatus = 'draft' | 'published';

export interface PolicyDocument {
  id: string;
  type: PolicyType;
  version: string;
  fileName: string;
  storageUrl: string;
  downloadUrl: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Timestamp;
  status: PolicyStatus;
  fileSize: number;
  isActive: boolean;
  content?: string; // Optional: for display without downloading
}

const POLICIES_COLLECTION = 'platform_policies';
const STORAGE_PATH = 'policies/v1';

/**
 * Upload a policy file to Firebase Storage and create metadata in Firestore
 */
export const uploadPolicy = async (
  type: PolicyType,
  content: string,
  fileName: string,
  uploadedBy: string = 'system',
  uploadedByName: string = 'System Admin'
): Promise<PolicyDocument> => {
  try {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${STORAGE_PATH}/${type}/${timestamp}_${sanitizedFileName}`;
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    await uploadString(storageRef, content, 'raw', {
      contentType: 'text/plain',
    });
    
    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);
    
    // Get latest version number for this type
    const existingDocs = await getPoliciesByType(type);
    const latestVersion = existingDocs.length > 0 
      ? parseFloat(existingDocs[0].version) + 0.1 
      : 1.0;
    
    // Create metadata in Firestore
    const policyData = {
      type,
      version: latestVersion.toFixed(1),
      fileName: sanitizedFileName,
      storageUrl: storagePath,
      downloadUrl,
      uploadedBy,
      uploadedByName,
      uploadedAt: Timestamp.now(),
      status: 'draft' as PolicyStatus,
      fileSize: new Blob([content]).size,
      isActive: false,
    };
    
    const docRef = await addDoc(collection(db, POLICIES_COLLECTION), policyData);
    
    return {
      id: docRef.id,
      ...policyData,
    };
  } catch (error) {
    console.error('Error uploading policy:', error);
    throw error;
  }
};

/**
 * Get all policies of a specific type
 */
export const getPoliciesByType = async (type: PolicyType): Promise<PolicyDocument[]> => {
  try {
    const q = query(
      collection(db, POLICIES_COLLECTION),
      where('type', '==', type)
    );
    
    const snapshot = await getDocs(q);
    const policies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PolicyDocument[];
    
    // Sort client-side to avoid needing composite index
    return policies.sort((a, b) => b.uploadedAt.toMillis() - a.uploadedAt.toMillis());
  } catch (error) {
    console.error('Error fetching policies:', error);
    throw error;
  }
};

/**
 * Get all policies (both types)
 */
export const getAllPolicies = async (): Promise<PolicyDocument[]> => {
  try {
    const q = query(
      collection(db, POLICIES_COLLECTION),
      orderBy('uploadedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PolicyDocument[];
  } catch (error) {
    console.error('Error fetching all policies:', error);
    throw error;
  }
};

/**
 * Get the active (published) policy of a specific type
 */
export const getActivePolicy = async (type: PolicyType): Promise<PolicyDocument | null> => {
  try {
    const q = query(
      collection(db, POLICIES_COLLECTION),
      where('type', '==', type),
      where('isActive', '==', true),
      where('status', '==', 'published')
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as PolicyDocument;
  } catch (error) {
    console.error('Error fetching active policy:', error);
    throw error;
  }
};

/**
 * Publish a policy (set as active and deactivate others of same type)
 */
export const publishPolicy = async (policyId: string, type: PolicyType): Promise<void> => {
  try {
    // First, deactivate all other policies of the same type
    const existingPolicies = await getPoliciesByType(type);
    const deactivatePromises = existingPolicies
      .filter(p => p.id !== policyId && p.isActive)
      .map(p => updateDoc(doc(db, POLICIES_COLLECTION, p.id), { 
        isActive: false,
        status: 'draft'
      }));
    
    await Promise.all(deactivatePromises);
    
    // Activate and publish the selected policy
    await updateDoc(doc(db, POLICIES_COLLECTION, policyId), {
      status: 'published',
      isActive: true,
    });
  } catch (error) {
    console.error('Error publishing policy:', error);
    throw error;
  }
};

/**
 * Update policy status
 */
export const updatePolicyStatus = async (
  policyId: string, 
  status: PolicyStatus
): Promise<void> => {
  try {
    await updateDoc(doc(db, POLICIES_COLLECTION, policyId), {
      status,
    });
  } catch (error) {
    console.error('Error updating policy status:', error);
    throw error;
  }
};

/**
 * Delete a policy (both Firestore metadata and Storage file)
 */
export const deletePolicy = async (policyId: string, storageUrl: string): Promise<void> => {
  try {
    // Delete from Storage
    const storageRef = ref(storage, storageUrl);
    await deleteObject(storageRef);
    
    // Delete from Firestore
    await deleteDoc(doc(db, POLICIES_COLLECTION, policyId));
  } catch (error) {
    console.error('Error deleting policy:', error);
    throw error;
  }
};

/**
 * Fetch policy content from storage URL
 */
export const fetchPolicyContent = async (downloadUrl: string): Promise<string> => {
  try {
    const response = await fetch(downloadUrl);
    return await response.text();
  } catch (error) {
    console.error('Error fetching policy content:', error);
    throw error;
  }
};
