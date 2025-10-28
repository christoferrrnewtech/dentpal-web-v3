import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ComplianceService, { COMPLIANCE_DEFAULTS } from '@/services/compliance';
import WarrantyService from '@/services/warranty';
import { Pencil, Trash2, Check, X } from 'lucide-react';

const WarrantyManager: React.FC = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<'manage' | 'view-all'>('manage');

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');

  const [compliance, setCompliance] = useState(COMPLIANCE_DEFAULTS);
  useEffect(() => {
    const unsub = ComplianceService.listen((opts) => setCompliance(opts));
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      const cats = await WarrantyService.getCategories();
      setCategories(cats);
    })();
  }, []);

  useEffect(() => {
    setSelectedSubcategory('');
    setSubcategories([]);
    if (!selectedCategory) return;
    (async () => {
      const subs = await WarrantyService.getSubcategories(selectedCategory);
      setSubcategories(subs);
    })();
  }, [selectedCategory]);

  const [duration, setDuration] = useState<string>('');

  // Load duration based on selection: subcategory if chosen, else category
  useEffect(() => {
    (async () => {
      if (!selectedCategory) { setDuration(''); return; }
      if (selectedSubcategory) {
        const rule = await WarrantyService.getSubcategoryRule(selectedCategory, selectedSubcategory);
        if (rule && rule.warrantyDuration) { setDuration(rule.warrantyDuration); return; }
        // If no subcategory rule, fall back to category rule (view-only until saved)
        const catRule = await WarrantyService.getCategoryRule(selectedCategory);
        setDuration(catRule?.warrantyDuration || '');
        return;
      }
      const catRule = await WarrantyService.getCategoryRule(selectedCategory);
      setDuration(catRule?.warrantyDuration || '');
    })();
  }, [selectedCategory, selectedSubcategory]);

  const refreshAll = async () => {
    try {
      const list = await WarrantyService.listAllRules();
      setAllRules(list as AllRow[]);
    } catch (e) {
      console.error('Failed to fetch warranty rules', e);
      toast({ title: 'Failed', description: 'Could not fetch warranty rules.' });
      setAllRules([]);
    }
  };

  const save = async () => {
    if (!selectedCategory) return;
    try {
      if (selectedSubcategory) {
        await WarrantyService.saveSubcategoryRule(
          selectedCategory,
          selectedSubcategory,
          { warrantyType: null, warrantyDuration: duration || null, subCategoryName: subcategories.find(s=>s.id===selectedSubcategory)?.name }
        );
      } else {
        await WarrantyService.saveCategoryRule(
          selectedCategory,
          { warrantyType: null, warrantyDuration: duration || null, categoryName: categories.find(c=>c.id===selectedCategory)?.name }
        );
      }
      toast({ title: 'Saved', description: 'Warranty duration saved.' });
      if (tab === 'view-all') await refreshAll();
    } catch (e) { console.error(e); toast({ title: 'Failed', description: 'Could not save warranty duration.' }); }
  };

  const del = async () => {
    if (!selectedCategory) return;
    try {
      if (selectedSubcategory) {
        await WarrantyService.deleteSubcategoryRule(selectedCategory, selectedSubcategory);
      } else {
        await WarrantyService.deleteCategoryRule(selectedCategory);
      }
      setDuration('');
      toast({ title: 'Deleted', description: 'Warranty rule removed.' });
      if (tab === 'view-all') await refreshAll();
    } catch (e) { console.error(e); toast({ title: 'Failed', description: 'Could not delete warranty rule.' }); }
  };

  // View All data (category + subcategory rows)
  type AllRow = { level: 'category' | 'subcategory'; categoryId: string; subcategoryId?: string; categoryName?: string; subCategoryName?: string; rule: { warrantyType: string | null; warrantyDuration: string | null; updatedAt?: number } };
  const [allRules, setAllRules] = useState<AllRow[]>([]);
  const [viewAllFilterCat, setViewAllFilterCat] = useState<string>('');
  const [editingKey, setEditingKey] = useState<string | null>(null); // e.g., category:<catId> or sub:<catId>/<subId>
  const [editingDuration, setEditingDuration] = useState<string>('');

  useEffect(() => {
    if (tab !== 'view-all') return;
    (async () => { await refreshAll(); })();
  }, [tab]);

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="rounded-lg border p-6 bg-amber-50 border-amber-200 text-amber-800">Admin access required.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button onClick={()=> setTab('manage')} className={`px-3 py-1.5 text-sm rounded-md ${tab==='manage' ? 'bg-white shadow border' : ''}`}>Manage</button>
          <button onClick={()=> setTab('view-all')} className={`px-3 py-1.5 text-sm rounded-md ${tab==='view-all' ? 'bg-white shadow border' : ''}`}>View All</button>
        </div>
        {tab === 'view-all' && (
          <button onClick={refreshAll} className="text-xs px-3 py-1.5 border rounded-md hover:bg-gray-50">Refresh</button>
        )}
      </div>

      {tab === 'manage' && (
        <div className="space-y-6">
          {/* Category/Subcategory and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={selectedCategory} onChange={(e)=> setSelectedCategory(e.target.value)} className="w-full text-sm p-2 border rounded-lg">
                <option value="">Select category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sub Category</label>
              <select value={selectedSubcategory} onChange={(e)=> setSelectedSubcategory(e.target.value)} className="w-full text-sm p-2 border rounded-lg" disabled={!selectedCategory}>
                <option value="">All (inherit category)</option>
                {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Warranty Duration</label>
              <select value={duration} onChange={(e)=> setDuration(e.target.value)} className="w-full text-sm p-2 border rounded-lg">
                <option value="">None</option>
                {compliance.durations.map(o => <option key={o.value} value={o.label}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={save} disabled={!selectedCategory} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm disabled:opacity-50">Save</button>
            <button onClick={del} disabled={!selectedCategory} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">Delete</button>
          </div>
        </div>
      )}

      {tab === 'view-all' && (
        <div className="rounded-lg border">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">All warranty rules</div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-600">Filter by Category</label>
              <select className="text-sm p-1.5 border rounded-md" value={viewAllFilterCat} onChange={(e)=> setViewAllFilterCat(e.target.value)}>
                <option value="">All categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="text-xs text-gray-500">
                {(() => {
                  const rows = viewAllFilterCat ? allRules.filter(r=>r.categoryId===viewAllFilterCat) : allRules;
                  return `${rows.length} ${rows.length === 1 ? 'rule' : 'rules'}`;
                })()}
              </div>
            </div>
          </div>
          <div className="divide-y">
            <div className="grid grid-cols-12 text-xs font-medium text-gray-500 px-4 py-2">
              <div className="col-span-5">Category</div>
              <div className="col-span-4">Subcategory</div>
              <div className="col-span-2">Warranty Duration</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            {(() => {
              const rows = viewAllFilterCat ? allRules.filter(r => r.categoryId === viewAllFilterCat) : allRules;
              if (rows.length === 0) return <div className="px-4 py-6 text-sm text-gray-500">No warranty rules yet.</div>;
              return rows.map((r) => {
                const key = r.level === 'category' ? `category:${r.categoryId}` : `sub:${r.categoryId}/${r.subcategoryId}`;
                const catName = categories.find(c => c.id === r.categoryId)?.name || r.categoryName || r.categoryId;
                const subName = r.level === 'subcategory' ? (r.subCategoryName || r.subcategoryId) : '—';
                const isEditing = editingKey === key;
                return (
                  <div key={key} className="grid grid-cols-12 items-center px-4 py-2 text-sm hover:bg-gray-50">
                    <div className="col-span-5 font-medium text-gray-900">{catName}</div>
                    <div className="col-span-4 text-gray-700">
                      {subName}
                      {r.level === 'subcategory' && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600">Subcat</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {isEditing ? (
                        <select className="w-full p-1.5 border rounded-md" value={editingDuration} onChange={(e)=> setEditingDuration(e.target.value)}>
                          <option value="">None</option>
                          {compliance.durations.map(o => <option key={o.value} value={o.label}>{o.label}</option>)}
                        </select>
                      ) : (
                        r.rule.warrantyDuration || <span className="text-gray-400">None</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-teal-600 text-white hover:bg-teal-700"
                            aria-label="Save"
                            onClick={async () => {
                              try {
                                if (r.level === 'category') {
                                  await WarrantyService.saveCategoryRule(r.categoryId, { warrantyType: null, warrantyDuration: editingDuration || null, categoryName: catName });
                                } else {
                                  await WarrantyService.saveSubcategoryRule(r.categoryId, r.subcategoryId!, { warrantyType: null, warrantyDuration: editingDuration || null, subCategoryName: subName !== '—' ? subName : undefined });
                                }
                                await refreshAll();
                                setEditingKey(null);
                                toast({ title: 'Saved', description: 'Warranty updated.' });
                              } catch (e) { console.error(e); toast({ title: 'Failed', description: 'Could not save.' }); }
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md border hover:bg-gray-50"
                            aria-label="Cancel"
                            onClick={() => setEditingKey(null)}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md border hover:bg-gray-50"
                            aria-label="Edit"
                            onClick={() => { setEditingKey(key); setEditingDuration(r.rule.warrantyDuration || ''); }}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md border text-red-600 hover:bg-red-50"
                            aria-label="Delete"
                            onClick={async () => {
                              try {
                                if (r.level === 'category') {
                                  await WarrantyService.deleteCategoryRule(r.categoryId);
                                } else {
                                  await WarrantyService.deleteSubcategoryRule(r.categoryId, r.subcategoryId!);
                                }
                                await refreshAll();
                                toast({ title: 'Deleted', description: 'Warranty removed.' });
                              } catch (e) { console.error(e); toast({ title: 'Failed', description: 'Could not delete.' }); }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarrantyManager;
