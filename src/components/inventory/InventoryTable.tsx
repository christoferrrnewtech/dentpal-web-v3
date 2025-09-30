import React from 'react';
import { InventoryItem } from './types';

interface Props { items: InventoryItem[]; onSelect: (id: string) => void; activeId?: string | null; }

const InventoryTable: React.FC<Props> = ({ items, onSelect, activeId }) => {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-[11px] font-semibold text-gray-600 tracking-wide">
            <th className="px-4 py-2">NAME</th>
            <th className="px-4 py-2">SUGGESTED THRESHOLD</th>
            <th className="px-4 py-2">IN STOCK</th>
            <th className="px-4 py-2">UPDATED</th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => {
            const isActive = i.id === activeId;
            return (
              <tr
                key={i.id}
                onClick={() => onSelect(i.id)}
                className={`cursor-pointer border-b last:border-0 transition ${isActive ? 'bg-teal-50' : 'hover:bg-gray-50'}`}
              >
                <td className="px-4 py-2 font-medium text-gray-900">{i.name}</td>
                <td className="px-4 py-2 text-gray-700">{i.suggestedThreshold}</td>
                <td className="px-4 py-2 text-gray-700">{i.inStock}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{new Date(i.updatedAt).toLocaleDateString()}</td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-xs text-gray-500">No items found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
export default InventoryTable;
