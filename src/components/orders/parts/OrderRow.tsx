import React from 'react';
import { Order } from '@/types/order';

interface OrderRowProps {
  order: Order;
  onClick?: () => void;
}

const OrderRow: React.FC<OrderRowProps> = ({ order, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center gap-4 group"
    >
      <div className="flex-1 flex items-center gap-6">
        <div className="w-20 text-xs font-medium text-gray-500">{new Date(order.timestamp).toLocaleDateString()}</div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 group-hover:text-teal-600 transition">{order.customer.name}</p>
          <p className="text-xs text-gray-500">{order.id}</p>
        </div>
        <div className="text-sm font-medium capitalize px-2 py-1 rounded bg-gray-100 text-gray-700">{order.status}</div>
        <div className="hidden lg:block text-xs text-gray-500">{order.package.size} / {order.package.weight}</div>
      </div>
      <div>
        <span className="text-xs px-3 py-1 border border-teal-600 text-teal-700 rounded-md font-medium group-hover:bg-teal-50">CONTACT NO</span>
      </div>
    </button>
  );
};

export default OrderRow;
