import React from 'react';
import { Order } from '@/types/order';

interface OrderRowProps {
  order: Order;
  onClick?: () => void;
}

const printInvoice = (order: Order) => {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<html><head><title>Invoice ${order.id}</title></head><body>`);
  w.document.write(`<h1>Invoice</h1>`);
  w.document.write(`<p><strong>Order ID:</strong> ${order.id}</p>`);
  w.document.write(`<p><strong>Date:</strong> ${order.timestamp}</p>`);
  w.document.write(`<p><strong>Buyer:</strong> ${order.customer.name}</p>`);
  w.document.write(`<p><strong>Contact:</strong> ${order.customer.contact}</p>`);
  if (order.itemsBrief) w.document.write(`<p><strong>Items:</strong> ${order.itemsBrief}</p>`);
  if (order.total != null) w.document.write(`<p><strong>Total:</strong> ${order.currency || 'PHP'} ${order.total}</p>`);
  w.document.write(`</body></html>`);
  w.document.close();
  w.print();
};

const downloadCSV = (order: Order) => {
  const rows = [
    ['Order ID','Date','Buyer','Contact','Items','Status','Total','Currency'],
    [order.id, order.timestamp, order.customer.name, order.customer.contact, order.itemsBrief || '', order.status, String(order.total ?? ''), order.currency || 'PHP']
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `order-${order.id}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const downloadPDF = (order: Order) => {
  // Simple fallback: reuse browser print to PDF
  printInvoice(order);
};

const OrderRow: React.FC<OrderRowProps> = ({ order, onClick }) => {
  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 flex items-center gap-6">
          {/* Date (no time) */}
          <div className="w-32 text-sm font-medium text-gray-700">{order.timestamp}</div>
          {/* Buyer */}
          <div className="w-44 text-sm text-gray-600 truncate">{order.customer.name}</div>
          {/* Product thumbnail */}
          {order.imageUrl ? (
            <img src={order.imageUrl} alt="Product" className="w-12 h-12 rounded-md object-cover border border-gray-200" />
          ) : (
            <div className="w-12 h-12 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">No Image</div>
          )}
          {/* Items brief and total */}
          <div className="flex-1 min-w-[200px]">
            <p className="font-medium text-gray-900">{order.itemsBrief || `${order.orderCount} item(s)`}</p>
            {order.total != null && (
              <p className="text-xs text-gray-500">Total: {order.currency || 'PHP'} {order.total}</p>
            )}
          </div>
          {/* Status */}
          <div className="text-xs font-medium capitalize px-2 py-1 rounded bg-gray-100 text-gray-700">{order.status}</div>
          {/* Size and contact */}
          <div className="hidden lg:block text-xs text-gray-500">{order.package.size} / {order.customer.contact || '—'}</div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="text-xs px-3 py-1 border border-gray-200 rounded hover:bg-gray-50" onClick={() => printInvoice(order)}>Print invoice</button>
          <button className="text-xs px-3 py-1 border border-gray-200 rounded hover:bg-gray-50" onClick={() => downloadCSV(order)}>Export CSV</button>
          <button className="text-xs px-3 py-1 border border-gray-200 rounded hover:bg-gray-50" onClick={() => downloadPDF(order)}>Export PDF</button>
          {onClick && (
            <button onClick={onClick} className="text-xs px-3 py-1 border border-teal-600 text-teal-700 rounded-md font-medium hover:bg-teal-50">Details</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderRow;
