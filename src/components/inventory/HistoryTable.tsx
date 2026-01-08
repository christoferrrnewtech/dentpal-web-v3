import React from 'react';

interface HistoryTableProps {
  data: Array<{
    adjustmentNo: string;
    date: string;
    reason: string;
    itemName: string;
    stockAfter: number;
  }>;
}

const HistoryTable: React.FC<HistoryTableProps> = ({ data }) => {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-[11px] font-semibold text-gray-600 tracking-wide">
              <th className="px-4 py-2">ADJUSTMENT</th>
              <th className="px-4 py-2">DATE</th>
              <th className="px-4 py-2 hidden sm:table-cell">REASON</th>
              <th className="px-4 py-2 hidden md:table-cell">ITEM</th>
              <th className="px-4 py-2">STOCK AFTER</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{row.adjustmentNo}</div>
                    <div className="sm:hidden mt-0.5 text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span className="">{row.reason}</span>
                      <span className="">• {row.itemName}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-700">{row.date}</td>
                <td className="px-4 py-2 text-gray-700 hidden sm:table-cell">{row.reason}</td>
                <td className="px-4 py-2 text-gray-700 hidden md:table-cell">{row.itemName}</td>
                <td className="px-4 py-2 text-gray-700">{row.stockAfter}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-500">No history found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryTable;
