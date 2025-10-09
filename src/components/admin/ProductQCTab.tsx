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

const ProductQCTab: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'approved' | 'violation'>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [qcTime, setQcTime] = useState<string>('');
  const [preview, setPreview] = useState<Row | null>(null);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
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

  // Resolve seller names from web_users once rows change
  useEffect(() => {
    const ids = Array.from(new Set(rows.map(r => r.sellerId).filter((v): v is string => !!v)));
    const missing = ids.filter(id => !(id in sellerNames));
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(missing.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'web_users', id));
          if (snap.exists()) {
            const d: any = snap.data();
            const name = d.name || d.displayName || d.fullName || d.email || id;
            updates[id] = String(name);
          } else {
            updates[id] = id;
          }
        } catch {
          updates[id] = id;
        }
      }));
      if (!cancelled) setSellerNames(prev => ({ ...prev, ...updates }));
    })();

    return () => { cancelled = true; };
  }, [rows, sellerNames]);

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
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">QC Time</label>
          <input
            type="datetime-local"
            value={qcTime}
            onChange={(e) => setQcTime(e.target.value)}
            className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-[11px] font-semibold text-gray-600 tracking-wide">
              <th className="px-4 py-2">SELLER</th>
              <th className="px-4 py-2">PRODUCT</th>
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
                <td className="px-4 py-3 text-gray-900 font-medium">{r.name}</td>
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
                <td colSpan={tab === 'violation' ? 5 : 4} className="px-4 py-8 text-center text-xs text-gray-500">No products.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Preview Dialog */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPreview(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              {preview.imageURL ? (
                <img src={preview.imageURL} alt={preview.name} className="h-14 w-14 rounded object-cover border" />
              ) : (
                <div className="h-14 w-14 rounded bg-gray-100 border" />
              )}
              <div>
                <div className="text-base font-semibold text-gray-900">{preview.name}</div>
                <div className="text-xs text-gray-500">Seller: {preview.sellerId || '—'}</div>
              </div>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap break-words max-h-60 overflow-auto">
              {preview.description || 'No description'}
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
