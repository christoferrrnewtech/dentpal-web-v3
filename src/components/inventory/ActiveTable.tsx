import React from 'react';

interface ActiveTableProps {
  data: Array<{
    sku: string;
    itemName: string;
    stockCount: number;
    status: string;
  }>;
}

const ActiveTable: React.FC<ActiveTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">SKU</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Item Name</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Stock Count</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="border-t">
              <td className="px-4 py-2 text-sm text-gray-800">{row.sku}</td>
              <td className="px-4 py-2 text-sm text-gray-800">{row.itemName}</td>
              <td className="px-4 py-2 text-sm text-gray-800">{row.stockCount}</td>
              <td className="px-4 py-2 text-sm text-gray-800">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ActiveTable;
