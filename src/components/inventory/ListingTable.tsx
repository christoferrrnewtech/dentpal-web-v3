import React from 'react';

interface ListingTableProps {
  data: Array<{
    itemName: string;
    stockCount: number;
    suggestedThreshold: number;
    status: string;
  }>;
}

const ListingTable: React.FC<ListingTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Item Name</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Stock Count</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Suggested Threshold</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="border-t">
              <td className="px-4 py-2 text-sm text-gray-800">{row.itemName}</td>
              <td className="px-4 py-2 text-sm text-gray-800">{row.stockCount}</td>
              <td className="px-4 py-2 text-sm text-gray-800">{row.suggestedThreshold}</td>
              <td className="px-4 py-2 text-sm text-gray-800">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ListingTable;
