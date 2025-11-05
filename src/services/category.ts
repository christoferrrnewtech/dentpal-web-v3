import { db } from '@/lib/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';

export type Category = { id: string; name: string };
export type Subcategory = { id: string; name: string };

const normalizeName = (raw: any, fallBackId: string) => {
  return String(
    raw?.name || raw?.categoryName || raw?.CategoryName || raw?.category || raw?.Category || raw?.title || raw?.displayName || raw?.label || fallBackId
  ).trim();
};

export const CategoryService = {
  listenCategories: (cb: (rows: Category[]) => void, onError?: (e: any) => void) => {
    const col = collection(db, 'Category');
    return onSnapshot(col, (snap) => {
      const rows = snap.docs
        .map(d => ({ id: d.id, name: normalizeName(d.data(), d.id) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      cb(rows);
    }, onError);
  },

  listenSubcategories: (categoryId: string, cb: (rows: Subcategory[]) => void, onError?: (e: any) => void) => {
    const col = collection(db, 'Category', categoryId, 'subCategory');
    return onSnapshot(col, (snap) => {
      const rows = snap.docs
        .map(d => {
          const data: any = d.data();
          const name = String(
            data?.subCategoryName || data?.subcategoryName || data?.name || data?.title || data?.displayName || data?.label || d.id
          ).trim();
          return { id: d.id, name } as Subcategory;
        })
        .filter(r => !!r.name)
        .sort((a, b) => a.name.localeCompare(b.name));
      cb(rows);
    }, onError);
  },

  addCategory: async (name: string) => {
    const v = name.trim();
    if (!v) throw new Error('Name is required');
    await addDoc(collection(db, 'Category'), { name: v, categoryName: v, createdAt: serverTimestamp() });
  },

  updateCategory: async (id: string, name: string) => {
    const v = name.trim();
    if (!v) throw new Error('Name is required');
    await updateDoc(doc(db, 'Category', id), { name: v, categoryName: v, updatedAt: serverTimestamp() });
  },

  deleteCategory: async (id: string) => {
    const subs = await getDocs(collection(db, 'Category', id, 'subCategory'));
    await Promise.allSettled(subs.docs.map((d) => deleteDoc(doc(db, 'Category', id, 'subCategory', d.id))));
    await deleteDoc(doc(db, 'Category', id));
  },

  addSubcategory: async (categoryId: string, name: string) => {
    const v = name.trim();
    if (!v) throw new Error('Name is required');
    await addDoc(collection(db, 'Category', categoryId, 'subCategory'), { name: v, subCategoryName: v, createdAt: serverTimestamp() });
  },

  updateSubcategory: async (categoryId: string, subId: string, name: string) => {
    const v = name.trim();
    if (!v) throw new Error('Name is required');
    await updateDoc(doc(db, 'Category', categoryId, 'subCategory', subId), { name: v, subCategoryName: v, updatedAt: serverTimestamp() });
  },

  deleteSubcategory: async (categoryId: string, subId: string) => {
    await deleteDoc(doc(db, 'Category', categoryId, 'subCategory', subId));
  },
};

export default CategoryService;
