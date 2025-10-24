import { db } from '@/lib/firebase';
import { collection, doc, getDocs, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, collectionGroup } from 'firebase/firestore';

export type WarrantyRule = {
  warrantyType: string | null;
  warrantyDuration: string | null;
  updatedAt?: number;
};

const ROOT = 'Warranty';

export const WarrantyService = {
  // Category/subcategory sources
  async getCategories(): Promise<Array<{ id: string; name: string }>> {
    const snap = await getDocs(collection(db, 'Category'));
    return snap.docs.map((d) => ({ id: d.id, name: String((d.data() as any)?.categoryName || '') }));
  },
  async getSubcategories(categoryId: string): Promise<Array<{ id: string; name: string }>> {
    const snap = await getDocs(collection(db, 'Category', categoryId, 'subCategory'));
    return snap.docs.map((d) => ({ id: d.id, name: String((d.data() as any)?.subCategoryName || '') }));
  },

  // Listen to category-level default rule
  listenCategoryRule(categoryId: string, cb: (rule: WarrantyRule | null) => void) {
    if (!categoryId) return () => {};
    const ref = doc(db, ROOT, categoryId);
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) return cb(null);
      const d = snap.data() as any;
      cb({ warrantyType: d.warrantyType ?? null, warrantyDuration: d.warrantyDuration ?? null, updatedAt: d.updatedAt ?? undefined });
    });
  },

  // Listen to subcategory rule
  listenSubcategoryRule(categoryId: string, subcategoryId: string, cb: (rule: WarrantyRule | null) => void) {
    if (!categoryId || !subcategoryId) return () => {};
    const ref = doc(db, ROOT, categoryId, 'subCategory', subcategoryId);
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) return cb(null);
      const d = snap.data() as any;
      cb({ warrantyType: d.warrantyType ?? null, warrantyDuration: d.warrantyDuration ?? null, updatedAt: d.updatedAt ?? undefined });
    });
  },

  // One-time fetch of category-level rule
  async getCategoryRule(categoryId: string): Promise<WarrantyRule | null> {
    const ref = doc(db, ROOT, categoryId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const d = snap.data() as any;
    return { warrantyType: d.warrantyType ?? null, warrantyDuration: d.warrantyDuration ?? null, updatedAt: d.updatedAt ?? undefined };
  },

  // Save category-level default rule
  async saveCategoryRule(categoryId: string, data: WarrantyRule & { categoryName?: string }) {
    const ref = doc(db, ROOT, categoryId);
    await setDoc(ref, { warrantyType: data.warrantyType ?? null, warrantyDuration: data.warrantyDuration ?? null, categoryName: data.categoryName ?? null, updatedAt: Date.now() }, { merge: true });
  },

  // Save subcategory rule
  async saveSubcategoryRule(categoryId: string, subcategoryId: string, data: WarrantyRule & { subCategoryName?: string }) {
    const ref = doc(db, ROOT, categoryId, 'subCategory', subcategoryId);
    await setDoc(ref, { warrantyType: data.warrantyType ?? null, warrantyDuration: data.warrantyDuration ?? null, subCategoryName: data.subCategoryName ?? null, updatedAt: Date.now() }, { merge: true });
  },

  // Delete category-level rule
  async deleteCategoryRule(categoryId: string) {
    const ref = doc(db, ROOT, categoryId);
    await deleteDoc(ref);
  },

  // Delete subcategory rule
  async deleteSubcategoryRule(categoryId: string, subcategoryId: string) {
    const ref = doc(db, ROOT, categoryId, 'subCategory', subcategoryId);
    await deleteDoc(ref);
  },

  // List all category-level rules (for View All)
  async listCategoryRules(): Promise<Array<{ categoryId: string; categoryName?: string; rule: WarrantyRule }>> {
    const snap = await getDocs(collection(db, ROOT));
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        categoryId: d.id,
        categoryName: data?.categoryName,
        rule: { warrantyType: data?.warrantyType ?? null, warrantyDuration: data?.warrantyDuration ?? null, updatedAt: data?.updatedAt }
      };
    });
  },

  // List all rules for View All (category-level + all subcategories)
  async listAllRules(): Promise<Array<{ level: 'category' | 'subcategory'; categoryId: string; subcategoryId?: string; categoryName?: string; subCategoryName?: string; rule: WarrantyRule }>> {
    const results: Array<{ level: 'category' | 'subcategory'; categoryId: string; subcategoryId?: string; categoryName?: string; subCategoryName?: string; rule: WarrantyRule }> = [];

    // Category-level docs
    const catDocs = await getDocs(collection(db, ROOT));
    for (const d of catDocs.docs) {
      const data = d.data() as any;
      results.push({
        level: 'category',
        categoryId: d.id,
        categoryName: data?.categoryName,
        rule: { warrantyType: data?.warrantyType ?? null, warrantyDuration: data?.warrantyDuration ?? null, updatedAt: data?.updatedAt }
      });
    }

    // All subcategory docs via collectionGroup
    const subDocs = await getDocs(collectionGroup(db, 'subCategory'));
    for (const d of subDocs.docs) {
      const parent = d.ref.parent.parent; // Warranty/{categoryId}
      const categoryId = parent?.id as string;
      const data = d.data() as any;
      results.push({
        level: 'subcategory',
        categoryId,
        subcategoryId: d.id,
        subCategoryName: data?.subCategoryName,
        rule: { warrantyType: data?.warrantyType ?? null, warrantyDuration: data?.warrantyDuration ?? null, updatedAt: data?.updatedAt }
      });
    }

    return results;
  },

  // Fetch a single subcategory rule
  async getSubcategoryRule(categoryId: string, subcategoryId: string): Promise<WarrantyRule | null> {
    if (!categoryId || !subcategoryId) return null;
    const ref = doc(db, ROOT, categoryId, 'subCategory', subcategoryId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const d = snap.data() as any;
    return { warrantyType: d.warrantyType ?? null, warrantyDuration: d.warrantyDuration ?? null, updatedAt: d.updatedAt ?? undefined };
  }
};

export default WarrantyService;
