import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FolderTree, Plus, Pencil, Trash2, Search } from 'lucide-react';
import CategoryService, { Category, Subcategory } from '@/services/category';

const toTitle = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/(^|\s)\S/g, (t) => t.toUpperCase());

const CategoryManager: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  // Subcategories for selected category
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  // Dialogs
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [editCatOpen, setEditCatOpen] = useState<null | Category>(null);
  const [deleteCatOpen, setDeleteCatOpen] = useState<null | Category>(null);
  const [catName, setCatName] = useState('');

  const [addSubOpen, setAddSubOpen] = useState(false);
  const [editSubOpen, setEditSubOpen] = useState<null | Subcategory>(null);
  const [deleteSubOpen, setDeleteSubOpen] = useState<null | Subcategory>(null);
  const [subName, setSubName] = useState('');

  useEffect(() => {
    const unsub = CategoryService.listenCategories((rows) => {
      setCategories(rows);
      setLoading(false);
      if (!selectedId && rows.length) setSelectedId(rows[0].id);
    }, (err) => {
      console.error('Failed to load categories', err);
      setLoading(false);
      toast({ title: 'Failed to load categories', description: 'Please check your Firestore rules and collection name "Category".', variant: 'destructive' });
    });
    return () => unsub();
  }, []);

  // Load subcategories when selection changes
  useEffect(() => {
    if (!selectedId) { setSubs([]); return; }
    setSubsLoading(true);
    const unsub = CategoryService.listenSubcategories(selectedId, (rows) => {
      setSubs(rows);
      setSubsLoading(false);
    }, (err) => {
      console.error('Failed to load subcategories', err);
      setSubs([]);
      setSubsLoading(false);
    });
    return () => unsub();
  }, [selectedId]);

  const filteredCategories = useMemo(() => {
    const t = filter.trim().toLowerCase();
    if (!t) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(t));
  }, [categories, filter]);

  const openAddCategory = () => { setCatName(''); setAddCatOpen(true); };
  const openEditCategory = (c: Category) => { setCatName(c.name); setEditCatOpen(c); };
  const openDeleteCategory = (c: Category) => { setDeleteCatOpen(c); };

  const confirmAddCategory = async () => {
    const name = toTitle(catName);
    try {
      await CategoryService.addCategory(name);
      setAddCatOpen(false);
      toast({ title: 'Category added', description: `${name} created.` });
    } catch (e: any) {
      toast({ title: 'Failed to add category', description: e.message || 'Try again.', variant: 'destructive' });
    }
  };

  const confirmEditCategory = async () => {
    const c = editCatOpen; if (!c) return;
    const name = toTitle(catName);
    try {
      await CategoryService.updateCategory(c.id, name);
      setEditCatOpen(null);
      toast({ title: 'Category updated', description: `${name} saved.` });
    } catch (e: any) {
      toast({ title: 'Failed to update category', description: e.message || 'Try again.', variant: 'destructive' });
    }
  };

  const confirmDeleteCategory = async () => {
    const c = deleteCatOpen; if (!c) return;
    try {
      await CategoryService.deleteCategory(c.id);
      setDeleteCatOpen(null);
      if (selectedId === c.id) setSelectedId(null);
      toast({ title: 'Category deleted', description: `${c.name} removed.` });
    } catch (e: any) {
      toast({ title: 'Failed to delete category', description: e.message || 'Try again.', variant: 'destructive' });
    }
  };

  const openAddSub = () => { setSubName(''); setAddSubOpen(true); };
  const openEditSub = (s: Subcategory) => { setSubName(s.name); setEditSubOpen(s); };
  const openDeleteSub = (s: Subcategory) => { setDeleteSubOpen(s); };

  const confirmAddSub = async () => {
    if (!selectedId) return;
    const name = toTitle(subName);
    try {
      await CategoryService.addSubcategory(selectedId, name);
      setAddSubOpen(false);
      toast({ title: 'Subcategory added', description: `${name} created.` });
    } catch (e: any) {
      toast({ title: 'Failed to add subcategory', description: e.message || 'Try again.', variant: 'destructive' });
    }
  };

  const confirmEditSub = async () => {
    const s = editSubOpen; if (!s || !selectedId) return;
    const name = toTitle(subName);
    try {
      await CategoryService.updateSubcategory(selectedId, s.id, name);
      setEditSubOpen(null);
      toast({ title: 'Subcategory updated', description: `${name} saved.` });
    } catch (e: any) {
      toast({ title: 'Failed to update subcategory', description: e.message || 'Try again.', variant: 'destructive' });
    }
  };

  const confirmDeleteSub = async () => {
    const s = deleteSubOpen; if (!s || !selectedId) return;
    try {
      await CategoryService.deleteSubcategory(selectedId, s.id);
      setDeleteSubOpen(null);
      toast({ title: 'Subcategory deleted', description: `${s.name} removed.` });
    } catch (e: any) {
      toast({ title: 'Failed to delete subcategory', description: e.message || 'Try again.', variant: 'destructive' });
    }
  };

  const selectedCategory = categories.find(c => c.id === selectedId) || null;

  return (
    <div className="space-y-6">
      {/* Hero/Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 text-white shadow">
        <div className="flex items-center justify-between">
          
          <Button onClick={openAddCategory} className="bg-white text-green-700 hover:bg-green-50">
            New Category
          </Button>
        </div>
      </div>

      {/* Main content: two tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Categories table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-0 overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={filter} onChange={(e)=> setFilter(e.target.value)} placeholder="Search category..." className="pl-9" />
            </div>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
                ) : filteredCategories.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-500">No categories found</td></tr>
                ) : (
                  filteredCategories.map((c) => (
                    <tr key={c.id} className={`hover:bg-gray-50 cursor-pointer ${selectedId===c.id? 'bg-gray-50' : ''}`}
                        onClick={()=> setSelectedId(c.id)}>
                      <td className="px-4 py-2">{c.name}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={(e)=> { e.stopPropagation(); openEditCategory(c); }}><Pencil className="w-4 h-4"/></Button>
                          <Button variant="ghost" size="sm" onClick={(e)=> { e.stopPropagation(); openDeleteCategory(c); }} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4"/></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subcategories table */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-0 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">{selectedCategory ? selectedCategory.name : 'Subcategories'}</div>
              <div className="text-xs text-gray-500">{selectedCategory ? 'Subcategories under this category' : 'Select a category to manage its subcategories'}</div>
            </div>
            <Button onClick={openAddSub} disabled={!selectedCategory} className="bg-green-600 hover:bg-green-700 text-white">New Subcategory</Button>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!selectedCategory ? (
                  <tr><td colSpan={2} className="px-4 py-12 text-center text-gray-500">Select a category to manage its subcategories</td></tr>
                ) : subsLoading ? (
                  <tr><td colSpan={2} className="px-4 py-12 text-center text-gray-500">Loading…</td></tr>
                ) : subs.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-12 text-center text-gray-500">No subcategories</td></tr>
                ) : (
                  subs.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2">{s.name}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={()=> openEditSub(s)}><Pencil className="w-4 h-4"/></Button>
                          <Button variant="ghost" size="sm" onClick={()=> openDeleteSub(s)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4"/></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Category */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
            <DialogDescription>Create a new top-level category</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input autoFocus value={catName} onChange={(e)=> setCatName(e.target.value)} placeholder="e.g. Orthodontics" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setAddCatOpen(false)}>Cancel</Button>
            <Button onClick={confirmAddCategory} className="bg-green-600 hover:bg-green-700 text-white">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category */}
      <Dialog open={!!editCatOpen} onOpenChange={(o)=> !o && setEditCatOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Rename this category</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input autoFocus value={catName} onChange={(e)=> setCatName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setEditCatOpen(null)}>Cancel</Button>
            <Button onClick={confirmEditCategory} className="bg-green-600 hover:bg-green-700 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category */}
      <Dialog open={!!deleteCatOpen} onOpenChange={(o)=> !o && setDeleteCatOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>This will also delete all its subcategories. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setDeleteCatOpen(null)}>Cancel</Button>
            <Button onClick={confirmDeleteCategory} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subcategory */}
      <Dialog open={addSubOpen} onOpenChange={setAddSubOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Subcategory</DialogTitle>
            <DialogDescription>Add a subcategory under {selectedCategory?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input autoFocus value={subName} onChange={(e)=> setSubName(e.target.value)} placeholder="e.g. Brackets" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setAddSubOpen(false)}>Cancel</Button>
            <Button onClick={confirmAddSub} className="bg-green-600 hover:bg-green-700 text-white">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subcategory */}
      <Dialog open={!!editSubOpen} onOpenChange={(o)=> !o && setEditSubOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
            <DialogDescription>Rename this subcategory</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input autoFocus value={subName} onChange={(e)=> setSubName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setEditSubOpen(null)}>Cancel</Button>
            <Button onClick={confirmEditSub} className="bg-green-600 hover:bg-green-700 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Subcategory */}
      <Dialog open={!!deleteSubOpen} onOpenChange={(o)=> !o && setDeleteSubOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Subcategory</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setDeleteSubOpen(null)}>Cancel</Button>
            <Button onClick={confirmDeleteSub} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManager;
