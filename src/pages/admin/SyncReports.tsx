/**
 * Admin Sync Reports Page
 * Simple UI to trigger reports sync without terminal/scripts
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { syncAllOrdersToReports, syncSellerReports } from '@/utils/syncReports';

export default function SyncReportsPage() {
  const { isAdmin } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="p-6 bg-white rounded-xl border">
        <p className="text-red-600">Access denied. Admin only.</p>
      </div>
    );
  }

  const handleSyncAll = async () => {
    if (!confirm('Sync all orders to seller reports? This may take a few minutes.')) {
      return;
    }

    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const res = await syncAllOrdersToReports();
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Sync failed');
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-4">Sync Seller Reports</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">What does this do?</h3>
          <p className="text-sm text-blue-800">
            This will create pre-aggregated reports in Firestore for all existing orders.
            Reports are stored in <code className="bg-blue-100 px-1 rounded">Seller/{'{sellerId}'}/reports/{'{orderId}'}</code>
          </p>
          <p className="text-sm text-blue-800 mt-2">
            This is a <strong>one-time operation</strong>. Future orders will automatically sync.
          </p>
        </div>

        <button
          onClick={handleSyncAll}
          disabled={syncing}
          className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition"
        >
          {syncing ? 'Syncing... Please wait' : 'Sync All Orders to Reports'}
        </button>

        {syncing && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⏳ Syncing orders... Check browser console for progress.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 mb-1">Error</h4>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">✅ Sync Complete!</h4>
            <div className="text-sm text-green-800 space-y-1">
              <p>Total orders processed: <strong>{result.totalOrders}</strong></p>
              <p>Reports synced: <strong>{result.syncedReports}</strong></p>
              <p>Skipped (no seller): <strong>{result.skippedOrders}</strong></p>
              <p>Errors: <strong>{result.errors}</strong></p>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-2">Alternative: Browser Console</h3>
          <p className="text-sm text-gray-600 mb-2">
            You can also run the sync from the browser console:
          </p>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`// Import the sync function
import { syncAllOrdersToReports } from './utils/syncReports';

// Run the sync
await syncAllOrdersToReports();`}
          </pre>
        </div>
      </div>
    </div>
  );
}
