import React from 'react';
import { Order } from '@/types/order';

interface OrderRowProps {
  order: Order;
  onDetails?: () => void; // preferred
  onClick?: () => void;   // backward-compat
}

// Build a high-quality printable invoice HTML with inline styles
const buildInvoiceHTML = (order: Order) => {
  const currency = order.currency || 'PHP';
  const total = order.total != null ? order.total : '';
  const hasItems = Array.isArray(order.items) && order.items.length > 0;
  const itemsMarkup = hasItems
    ? `<table style="width:100%; border-collapse:collapse; margin-top:8px;">
         <thead>
           <tr>
             <th align="left" style="border-bottom:1px solid #e2e8f0; padding:8px 0; font-size:12px; color:#64748b;">Item</th>
             <th align="right" style="border-bottom:1px solid #e2e8f0; padding:8px 0; font-size:12px; color:#64748b;">Qty</th>
             <th align="right" style="border-bottom:1px solid #e2e8f0; padding:8px 0; font-size:12px; color:#64748b;">Price</th>
           </tr>
         </thead>
         <tbody>
           ${order.items!.map(it => `<tr>
             <td style="padding:10px 0; border-bottom:1px solid #f1f5f9;">${it.name}</td>
             <td align="right" style="padding:10px 0; border-bottom:1px solid #f1f5f9;">${it.quantity}</td>
             <td align="right" style="padding:10px 0; border-bottom:1px solid #f1f5f9;">${it.price != null ? currency + ' ' + it.price : ''}</td>
           </tr>`).join('')}
         </tbody>
       </table>`
    : `<div class="items">${order.itemsBrief || `${order.orderCount} item(s)`}</div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${order.id}</title>
  <style>
    :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --brand:#0d9488; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color: var(--ink); }
    .sheet { max-width: 800px; margin: 24px auto; padding: 32px; border: 1px solid var(--line); border-radius: 16px; }
    .header { display:flex; align-items:center; justify-content:space-between; gap:16px; padding-bottom:16px; border-bottom:1px solid var(--line); }
    .brand { display:flex; align-items:center; gap:12px; }
    .brand-badge { width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg,#0ea5e9,#0d9488); box-shadow: 0 4px 12px rgba(13,148,136,0.25); }
    .title { font-size:20px; font-weight:700; }
    .meta { text-align:right; font-size:12px; color: var(--muted); }
    .section { padding:16px 0; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .label { font-size:12px; color: var(--muted); }
    .value { font-size:14px; font-weight:600; }
    .row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .badge { display:inline-flex; align-items:center; gap:6px; padding:4px 8px; font-size:11px; border-radius:999px; border:1px solid var(--line); color:#0f172a; }
    .items { background:#f8fafc; border:1px solid var(--line); border-radius:12px; padding:12px; }
    .total { font-size:18px; font-weight:700; }
    .footer { margin-top:24px; padding-top:16px; border-top:1px solid var(--line); font-size:12px; color: var(--muted); }
    @media print { body { background:white; } .sheet { border:none; box-shadow:none; margin:0; border-radius:0; } .actions { display:none !important; } @page { size: A4; margin: 16mm; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        <div class="brand-badge"></div>
        <div class="title">Invoice</div>
      </div>
      <div class="meta">
        <div><strong>Order #</strong> ${order.id}</div>
        <div>${order.timestamp}</div>
      </div>
    </div>

    <div class="section grid">
      <div>
        <div class="label">Buyer</div>
        <div class="value">${order.customer.name || ''}</div>
        <div class="label" style="margin-top:4px">Contact</div>
        <div class="value">${order.customer.contact || ''}</div>
      </div>
      <div>
        <div class="label">Status</div>
        <div class="badge">${order.status}</div>
        <div class="label" style="margin-top:8px">Tracking / Barcode</div>
        <div class="value">${order.barcode}</div>
      </div>
    </div>

    <div class="section">
      <div class="label">Items</div>
      ${itemsMarkup}
    </div>

    <div class="section row">
      <div class="label">Total</div>
      <div class="total">${currency} ${total}</div>
    </div>

    <div class="footer">
      Thanks for your purchase. This is a system-generated invoice. For concerns, contact support.
    </div>
    <div class="actions" style="margin-top:16px">
      <button onclick="window.print()" style="padding:10px 14px; border:1px solid var(--line); border-radius:10px; background:white; cursor:pointer">Print</button>
    </div>
  </div>
</body>
</html>`;
};

const printInvoice = (order: Order) => {
  const html = buildInvoiceHTML(order);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Some browsers need a small delay before print
  setTimeout(() => w.print(), 300);
};

const exportCSV = (order: Order) => {
  const rows: string[][] = [];
  rows.push(['Order ID','Date','Buyer','Contact','Barcode','Status','Currency']);
  rows.push([order.id, order.timestamp, order.customer.name, order.customer.contact, order.barcode, order.status, order.currency || 'PHP']);
  rows.push([]);
  rows.push(['Items']);
  rows.push(['Name','Quantity','Price']);
  if (Array.isArray(order.items) && order.items.length > 0) {
    order.items.forEach(it => rows.push([it.name, String(it.quantity), it.price != null ? String(it.price) : '']));
  } else {
    rows.push([order.itemsBrief || `${order.orderCount} item(s)`, '', '']);
  }
  rows.push([]);
  rows.push(['Total', '', String(order.total ?? '')]);

  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `order-${order.id}-${order.timestamp}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const exportPDF = (order: Order) => {
  // Use the same high-quality invoice HTML and let the user Save as PDF
  printInvoice(order);
};

const OrderRow: React.FC<OrderRowProps> = ({ order, onDetails, onClick }) => {
  const [open, setOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [itemsOpen, setItemsOpen] = React.useState(false);

  const hasMultiItems = Array.isArray(order.items) && order.items.length >= 2;

  const handleDetails = () => {
    if (onDetails) return onDetails();
    if (onClick) return onClick();
    setOpen(true);
  };

  React.useEffect(() => {
    if (!menuOpen && !itemsOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const withinActions = target.closest?.('[data-actions-menu]');
      const withinItems = target.closest?.('[data-items-menu]');
      if (!withinActions) setMenuOpen(false);
      if (!withinItems) setItemsOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [menuOpen, itemsOpen]);

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 flex items-center gap-6">
          {/* Date (no time) */}
          <div className="w-32 text-sm font-medium text-gray-700">{order.timestamp}</div>
          {/* Product thumbnail */}
          {order.imageUrl ? (
            <img src={order.imageUrl} alt="Product" className="w-12 h-12 rounded-md object-cover border border-gray-200" />
          ) : (
            <div className="w-12 h-12 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">No Image</div>
          )}
          {/* Items brief and total */}
          <div className="flex-1 min-w-[200px]" data-items-menu>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{order.itemsBrief || `${order.orderCount} item(s)`}</p>
              {hasMultiItems && (
                <button
                  type="button"
                  className="text-[11px] px-2 py-0.5 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700"
                  onClick={(e) => { e.stopPropagation(); setItemsOpen(v => !v); }}
                  title="Show items"
                >
                  Items ▾
                </button>
              )}
            </div>
            {/* Inline expanded items list */}
            {itemsOpen && hasMultiItems && (
              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs text-gray-600">Products in this order</div>
                <ul className="divide-y divide-gray-100 max-h-64 overflow-auto">
                  {order.items!.map((it, idx) => (
                    <li key={idx} className="px-3 py-2 flex items-center gap-3">
                      {it.imageUrl ? (
                        <img src={it.imageUrl} alt={it.name} className="w-10 h-10 rounded-md object-cover border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">No Image</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 truncate">{it.name}</div>
                        {(it.sku || it.productId) && (
                          <div className="text-[11px] text-gray-500 truncate">{it.sku || it.productId}</div>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 whitespace-nowrap">x{it.quantity}</div>
                      <div className="text-sm text-gray-900 whitespace-nowrap">{typeof it.price !== 'undefined' ? `${order.currency || 'PHP'} ${it.price}` : ''}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {order.total != null && (
              <p className="text-xs text-gray-500 mt-1">Total: {order.currency || 'PHP'} {order.total}</p>
            )}
          </div>
          {/* Status */}
          <div className="text-xs font-medium capitalize px-2 py-1 rounded bg-gray-100 text-gray-700">{order.status}</div>
          {/* Size and contact */}
          <div className="hidden lg:block text-xs text-gray-500">{order.package.size} / {order.customer.contact || '—'}</div>
        </div>
        {/* Actions: compact dropdown */}
        <div className="relative" data-actions-menu>
          <button
            type="button"
            className="text-xs px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 shadow-sm"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
            title="Invoice and export options"
          >
            Actions ▾
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
              <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => { setMenuOpen(false); printInvoice(order); }}>🖨️ Print invoice</button>
              <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => { setMenuOpen(false); exportCSV(order); }}>📄 Export CSV</button>
              <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => { setMenuOpen(false); exportPDF(order); }}>📎 Export PDF</button>
            </div>
          )}
        </div>
        {/* Details */}
        <button type="button" onClick={handleDetails} className="text-xs px-3 py-1 border border-teal-600 text-teal-700 rounded-md font-medium hover:bg-teal-50">Details</button>
      </div>

      {/* Details Modal (fallback if no external handler provided) */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-[92vw] max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Order Details</h3>
              <button className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <div><span className="font-medium">Order ID:</span> {order.id}</div>
              <div><span className="font-medium">Date:</span> {order.timestamp}</div>
              <div><span className="font-medium">Status:</span> {order.status}</div>
              {order.itemsBrief && <div><span className="font-medium">Items:</span> {order.itemsBrief}</div>}
              {order.total != null && <div><span className="font-medium">Total:</span> {order.currency || 'PHP'} {order.total}</div>}
              <div><span className="font-medium">Buyer:</span> {order.customer.name || '—'}</div>
              <div><span className="font-medium">Contact:</span> {order.customer.contact || '—'}</div>
              <div><span className="font-medium">Tracking No.:</span> {order.barcode}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderRow;
