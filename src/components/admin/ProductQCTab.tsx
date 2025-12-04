import React, { useEffect, useMemo, useState } from 'react';
import { ProductService } from '@/services/product';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Eye, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface Row {
  id: string;
  sellerId?: string;
  name: string;
  description?: string;
  imageURL?: string;
  createdAt?: any;
  qcReason?: string;
}

const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 });

const ProductQCTab: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'approved' | 'violation'>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [qcTime, setQcTime] = useState<string>('');
  const [preview, setPreview] = useState<Row | null>(null);
  const [previewDetail, setPreviewDetail] = useState<null | { product: any; variations: any[] }>(null);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [priceMap, setPriceMap] = useState<Record<string, number | undefined>>({});
  const [stockMap, setStockMap] = useState<Record<string, number | undefined>>({});
  const { toast } = useToast();
  const { uid } = useAuth();

  // Subscribe per-tab
  useEffect(() => {
    let unsubscribe: any = null;
    if (tab === 'pending') {
      unsubscribe = ProductService.listenPendingQC((items) => {
        const mapped = items.map(({ id, data }) => ({
          id,
          sellerId: String(data.sellerId || ''),
          name: String(data.name || ''),
          description: String(data.description || ''),
          imageURL: data.imageURL || '',
          createdAt: data.createdAt,
        }));
        setRows(mapped);
      });
    } else if (tab === 'approved') {
      unsubscribe = ProductService.listenApproved((items) => {
        const mapped = items.map(({ id, data }) => ({
          id,
          sellerId: String(data.sellerId || ''),
          name: String(data.name || ''),
          description: String(data.description || ''),
          imageURL: data.imageURL || '',
          createdAt: data.createdAt,
        }));
        setRows(mapped);
      });
    } else if (tab === 'violation') {
      unsubscribe = ProductService.listenViolation((items) => {
        const mapped = items.map(({ id, data }) => ({
          id,
          sellerId: String(data.sellerId || ''),
          name: String(data.name || ''),
          description: String(data.description || ''),
          imageURL: data.imageURL || '',
          qcReason: String(data.qcReason || ''),
          createdAt: data.createdAt,
        }));
        setRows(mapped);
      });
    }
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [tab]);

  // Resolve seller names
  useEffect(() => {
    const ids = Array.from(new Set(rows.map(r => r.sellerId).filter((v): v is string => !!v)));
    const missing = ids.filter(id => !(id in sellerNames));
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(missing.map(async (id) => {
        try {
          // Try Seller collection first (new schema)
          let snap = await getDoc(doc(db, 'Seller', id));
          if (snap.exists()) {
            const d: any = snap.data();
            const name = d.name || d.displayName || d.fullName || d.vendor?.company?.name || d.vendor?.contacts?.name || d.email || id;
            updates[id] = String(name);
          } else {
            // Fallback to web_users collection (legacy)
            snap = await getDoc(doc(db, 'web_users', id));
            if (snap.exists()) {
              const d: any = snap.data();
              const name = d.name || d.displayName || d.fullName || d.email || id;
              updates[id] = String(name);
            } else {
              updates[id] = id;
            }
          }
        } catch {
          updates[id] = id;
        }
      }));
      if (!cancelled) setSellerNames(prev => ({ ...prev, ...updates }));
    })();

    return () => { cancelled = true; };
  }, [rows, sellerNames]);

  // Derive product price and total stock for list view (especially Pending QC)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const targets = rows.filter(r => priceMap[r.id] === undefined || stockMap[r.id] === undefined);
      if (targets.length === 0) return;
      const updatesPrice: Record<string, number | undefined> = {};
      const updatesStock: Record<string, number | undefined> = {};
      await Promise.all(targets.map(async (r) => {
        try {
          const detail = await ProductService.getProductDetail(r.id);
          if (!detail) { updatesPrice[r.id] = undefined; updatesStock[r.id] = undefined; return; }
          const p: any = detail.product;
          const vars: any[] = Array.isArray(detail.variations) ? detail.variations : [];
          // price: prefer product.lowestPrice, else min variation price
          const varPrices = vars.map(v => Number(v.price ?? 0)).filter(n => Number.isFinite(n) && n > 0);
          const minVar = varPrices.length ? Math.min(...varPrices) : undefined;
          const price = p?.lowestPrice != null ? Number(p.lowestPrice) : (p?.price != null ? Number(p.price) : minVar);
          const totalStock = vars.reduce((s, v) => s + (Number(v.stock ?? 0) || 0), 0);
          updatesPrice[r.id] = price;
          updatesStock[r.id] = totalStock;
        } catch {
          updatesPrice[r.id] = undefined;
          updatesStock[r.id] = undefined;
        }
      }));
      if (!cancelled && (Object.keys(updatesPrice).length || Object.keys(updatesStock).length)) {
        setPriceMap(prev => ({ ...prev, ...updatesPrice }));
        setStockMap(prev => ({ ...prev, ...updatesStock }));
      }
    };
    load();
    return () => { cancelled = true; };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.name.toLowerCase().includes(q) || r.sellerId?.toLowerCase().includes(q));
  }, [rows, search]);

  const approve = async (id: string) => {
    try {
      await ProductService.approveProduct(id);
      const at = qcTime ? new Date(qcTime).getTime() : Date.now();
      await ProductService.addQCAudit(id, { action: 'approve', at, adminId: uid || null });
      toast({ title: 'Approved', description: 'Product moved to Active.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to approve', description: 'Please try again.' });
    }
  };

  const reject = async () => {
    if (!rejectId) return;
    try {
      await ProductService.rejectProduct(rejectId, reason);
      const at = qcTime ? new Date(qcTime).getTime() : Date.now();
      await ProductService.addQCAudit(rejectId, { action: 'reject', at, reason, adminId: uid || null });
      toast({ title: 'Rejected', description: 'Product moved to Violation.' });
      setRejectId(null);
      setReason('');
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to reject', description: 'Please try again.' });
    }
  };

  // Load preview details when preview row set
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!preview) { setPreviewDetail(null); return; }
      try {
        const detail = await ProductService.getProductDetail(preview.id);
        if (!cancelled) setPreviewDetail(detail);
      } catch {
        if (!cancelled) setPreviewDetail(null);
      }
    })();
    return () => { cancelled = true; };
  }, [preview]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by seller or product name"
            className="w-64 max-w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Inner Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'violation', label: 'Violation' },
        ].map(t => (
          <button
            key={t.key}
            className={`px-3 py-1.5 text-sm font-medium rounded ${tab === t.key ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setTab(t.key as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table: columns -> Seller, Product Name, Price, Image, Action (Violation shows extra Reason) */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-[11px] font-semibold text-gray-600 tracking-wide">
              <th className="px-4 py-2">SELLER</th>
              <th className="px-4 py-2">PRODUCT NAME</th>
              <th className="px-4 py-2">PRODUCT PRICE</th>
              <th className="px-4 py-2">IMAGE</th>
              {tab === 'violation' && <th className="px-4 py-2">REASON</th>}
              <th className="px-4 py-2 w-48">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">
                  <div className="text-sm font-medium">{(r.sellerId && sellerNames[r.sellerId]) || r.sellerId || '—'}</div>
                </td>
                <td className="px-4 py-3 text-gray-900">{r.name || '—'}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {priceMap[r.id] != null ? (
                    <span>{currency.format(Number(priceMap[r.id]))}</span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.imageURL ? (
                    <img src={r.imageURL} alt={r.name} className="h-12 w-12 rounded object-cover bg-gray-100 border" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-gray-100 border flex items-center justify-center text-gray-400">No image</div>
                  )}
                </td>
                {tab === 'violation' && (
                  <td className="px-4 py-3 text-gray-600 max-w-[420px]"><div className="line-clamp-2">{r.qcReason || '—'}</div></td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {tab === 'pending' && (
                      <>
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                          onClick={() => approve(r.id)}
                          title="Approve"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm"
                          onClick={() => setRejectId(r.id)}
                          title="Reject / Violation"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Violation
                        </button>
                      </>
                    )}
                    {tab === 'approved' && (
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm"
                        onClick={() => setRejectId(r.id)}
                        title="Mark as Violation"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Violation
                      </button>
                    )}
                    {tab === 'violation' && (
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                        onClick={() => approve(r.id)}
                        title="Approve"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </button>
                    )}
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
                      onClick={() => setPreview(r)}
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={tab === 'violation' ? 6 : 5} className="px-4 py-8 text-center text-xs text-gray-500">No products.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Preview Dialog: detailed high-UX card with product and variations */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPreview(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3">
                {preview.imageURL ? (
                  <img src={preview.imageURL} alt={preview.name} className="w-full aspect-square object-cover rounded-xl border bg-gray-50" />
                ) : (
                  <div className="w-full aspect-square rounded-xl border bg-gray-50" />
                )}
              </div>
              <div className="md:w-2/3 space-y-2">
                <div className="text-xl font-semibold text-gray-900">{preview.name}</div>
                <div className="text-sm text-gray-500">Seller: {(preview.sellerId && sellerNames[preview.sellerId]) || preview.sellerId || '—'}</div>
                <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap break-words max-h-40 overflow-auto border rounded-lg p-3 bg-gray-50">
                  {preview.description || 'No description'}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-lg border bg-white">
                    <div className="text-[10px] text-gray-500">Price</div>
                    <div className="text-base font-semibold">{priceMap[preview.id] != null ? currency.format(Number(priceMap[preview.id])) : '—'}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-white">
                    <div className="text-[10px] text-gray-500">Quantity (Total stock)</div>
                    <div className="text-base font-semibold">{stockMap[preview.id] != null ? Number(stockMap[preview.id]).toLocaleString() : '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Variations table */}
            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-900 mb-2">Variations</div>
              <div className="overflow-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">SKU</th>
                      <th className="text-left px-3 py-2 font-medium">Price</th>
                      <th className="text-left px-3 py-2 font-medium">Stock</th>
                      <th className="text-left px-3 py-2 font-medium">Dimension</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewDetail?.variations?.length ? (
                      previewDetail.variations.map((v: any) => {
                        const dim = v.dimension || v.dimensions || {};
                        const h = Number(dim.height ?? dim.H ?? 0) || undefined;
                        const w = Number(dim.width ?? dim.W ?? 0) || undefined;
                        const l = Number(dim.length ?? dim.L ?? 0) || undefined;
                        const dimTxt = [l, w, h].filter(x => x != null).join(' × ');
                        return (
                          <tr key={v.id} className="border-t last:border-b-0">
                            <td className="px-3 py-2">{v.name || '—'}</td>
                            <td className="px-3 py-2">{v.SKU || v.sku || '—'}</td>
                            <td className="px-3 py-2">{v.price != null ? currency.format(Number(v.price)) : '—'}</td>
                            <td className="px-3 py-2">{v.stock != null ? Number(v.stock).toLocaleString() : '—'}</td>
                            <td className="px-3 py-2">{dimTxt || '—'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-xs text-gray-500">No variations found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800" onClick={() => setPreview(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRejectId(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Mark as Violation</h3>
            <p className="text-xs text-gray-500 mb-4">Provide a reason so the seller can correct the product details.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={4}
              placeholder="Reason for violation (e.g. misleading image, incorrect category)"
            />
            <div className="mt-4">
              <label className="block text-xs text-gray-600 mb-1">QC Time</label>
              <input
                type="datetime-local"
                value={qcTime}
                onChange={(e) => setQcTime(e.target.value)}
                className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800" onClick={() => setRejectId(null)}>Cancel</button>
              <button className="px-3 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40" onClick={reject} disabled={!reason.trim()}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductQCTab;
