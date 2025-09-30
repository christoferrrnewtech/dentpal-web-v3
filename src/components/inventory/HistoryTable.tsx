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
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Adjustment No.</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Date</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Reason</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Item Name</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Stock After</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="border-t">
              <td className="px-4 py-2 text-sm text-gray-800">{row.adjustmentNo}</td>
              <td className="px-4 py-2 text-sm text-gray-800">{row.date}</td>
              <td className="px-4 py-2 text-sm text-gray-800">{row.reason}</td>
              <td className="px-4 py-2 text-sm text-gray-800">{row.itemName}</td>
              <td className="px-4 py-2 text-sm text-gray-800">{row.stockAfter}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryTable;
