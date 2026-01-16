import React, { useMemo } from 'react';
import DateRangePicker from '@/components/ui/DateRangePicker';

interface InventoryHistoryViewProps {
  logs: any[];
  logsLoading: boolean;
  logsDateRange: { start: Date | null; end: Date | null };
  setLogsDateRange: (range: { start: Date | null; end: Date | null }) => void;
  logsPage: number;
  setLogsPage: (page: number | ((prev: number) => number)) => void;
  logsPerPage: number;
  exportLogs: () => void;
}

const InventoryHistoryView: React.FC<InventoryHistoryViewProps> = ({
  logs,
  logsLoading,
  logsDateRange,
  setLogsDateRange,
  logsPage,
  setLogsPage,
  logsPerPage,
  exportLogs,
}) => {
  // Filter logs by date range
  const filteredLogs = useMemo(() => {
    if (!logsDateRange?.start || !logsDateRange?.end) return logs;
    const startTime = new Date(logsDateRange.start);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(logsDateRange.end);
    endTime.setHours(23, 59, 59, 999);
    return logs.filter(log => {
      if (!log.at) return false;
      const logTime = new Date(log.at);
      return logTime >= startTime && logTime <= endTime;
    });
  }, [logs, logsDateRange]);
  const paginatedLogs = useMemo(() => {
    const start = (logsPage - 1) * logsPerPage;
    return filteredLogs.slice(start, start + logsPerPage);
  }, [filteredLogs, logsPage, logsPerPage]);
  
  const totalLogsPages = Math.ceil(filteredLogs.length / logsPerPage);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap items-center gap-3 justify-between">
        <DateRangePicker
          value={logsDateRange}
          onChange={setLogsDateRange}
          onApply={() => setLogsPage(1)}
          label="Select date range"
        />
        
        <button
          onClick={exportLogs}
          disabled={filteredLogs.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export
        </button>
      </div>

      {/* History Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Timestamp</th>
                <th className="text-left p-3 font-medium text-gray-600">Item Name</th>
                <th className="text-left p-3 font-medium text-gray-600">Variant</th>
                <th className="text-left p-3 font-medium text-gray-600">Account Name</th>
                <th className="text-left p-3 font-medium text-gray-600">Reason</th>
                <th className="text-center p-3 font-medium text-gray-600">Adjustment</th>
                <th className="text-center p-3 font-medium text-gray-600">Stock After</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading && (
                <>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></td>
                      <td className="p-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-40" /></td>
                      <td className="p-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></td>
                      <td className="p-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-28" /></td>
                      <td className="p-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-48" /></td>
                      <td className="p-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-16" /></td>
                      <td className="p-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-16" /></td>
                    </tr>
                  ))}
                </>
              )}
              {!logsLoading && paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    {logs.length === 0 
                      ? 'No history found. Stock adjustments will appear here.'
                      : 'No history matches your date range.'}
                  </td>
                </tr>
              )}
              {!logsLoading && paginatedLogs.map((log) => {
                let timestamp = 'N/A';
                if (log.at) {
                  const d = new Date(log.at);
                  timestamp = d.toLocaleString(undefined, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                }
                
                const itemName = log.productName || 'Unknown';
                const variant = log.before?.variationName || log.after?.variationName || 'N/A';
                const accountName = log.userName || log.userId || 'Unknown';
                const reason = log.detail || 'N/A';
                
                let adjustment = 'N/A';
                let stockAfter = 'N/A';
                if (log.action === 'adjust_stock') {
                  const before = log.before?.stock || 0;
                  const after = log.after?.stock || 0;
                  const delta = after - before;
                  adjustment = delta >= 0 ? `+${delta}` : `${delta}`;
                  stockAfter = after.toString();
                }
                
                return (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-700">{timestamp}</td>
                    <td className="p-3 text-gray-900 font-medium">{itemName}</td>
                    <td className="p-3 text-gray-700">{variant}</td>
                    <td className="p-3 text-gray-700">{accountName}</td>
                    <td className="p-3 text-gray-600 text-xs">{reason}</td>
                    <td className="p-3 text-center">
                      {adjustment !== 'N/A' && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          adjustment.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {adjustment}
                        </span>
                      )}
                      {adjustment === 'N/A' && <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="p-3 text-center text-gray-900 font-medium">{stockAfter}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!logsLoading && totalLogsPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-600">
            Showing {((logsPage - 1) * logsPerPage) + 1} to {Math.min(logsPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogsPage(p => Math.max(1, p - 1))}
              disabled={logsPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="text-xs text-gray-600">
              Page {logsPage} of {totalLogsPages}
            </div>
            <button
              onClick={() => setLogsPage(p => Math.min(totalLogsPages, p + 1))}
              disabled={logsPage === totalLogsPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryHistoryView;
