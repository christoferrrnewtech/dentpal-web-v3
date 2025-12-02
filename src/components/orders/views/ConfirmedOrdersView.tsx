import React from 'react';
import { Order } from '@/types/order';
import OrderRow from '../parts/OrderRow';

interface ViewProps { 
  orders: Order[]; 
  onSelectOrder?: (o: Order) => void;
  onMoveToToShip?: (o: Order) => void;
}

const ConfirmedOrdersView: React.FC<ViewProps> = ({ orders, onSelectOrder, onMoveToToShip }) => {
  return (
    <div className="space-y-4">
      {orders.map(o => (
        <ConfirmedOrderRow 
          key={o.id} 
          order={o} 
          onDetails={() => onSelectOrder?.(o)}
          onMoveToToShip={onMoveToToShip}
        />
      ))}
    </div>
  );
};

// Custom OrderRow component for confirmed orders
interface ConfirmedOrderRowProps {
  order: Order;
  onDetails?: () => void;
  onMoveToToShip?: (order: Order) => void;
}

const ConfirmedOrderRow: React.FC<ConfirmedOrderRowProps> = ({ order, onDetails, onMoveToToShip }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  
  React.useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const withinActions = target.closest?.('[data-actions-menu]');
      if (!withinActions) setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [menuOpen]);

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 flex items-center gap-6">
          {/* Date */}
          <div className="w-32 text-sm font-medium text-gray-700">{order.timestamp}</div>
          
          {/* Product thumbnail */}
          {order.imageUrl ? (
            <img src={order.imageUrl} alt="Product" className="w-12 h-12 rounded-md object-cover border border-gray-200" />
          ) : (
            <div className="w-12 h-12 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">No Image</div>
          )}
          
          {/* Items brief and total */}
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{order.itemsBrief || `${order.orderCount} item(s)`}</p>
            </div>
            {order.total != null && (
              <p className="text-xs text-gray-500 mt-1">Total: {order.currency || 'PHP'} {order.total}</p>
            )}
          </div>
          
          {/* Status */}
          <div className="text-xs font-medium capitalize px-2 py-1 rounded bg-green-100 text-green-700 border border-green-200">
            {order.status === 'confirmed' ? 'to_ship' : order.status}
          </div>
          
          {/* Size and contact */}
          <div className="hidden lg:block text-xs text-gray-500">
            {order.package.size} / {order.customer.contact || '—'}
          </div>
        </div>

        {/* Action buttons on the right side */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMoveToToShip?.(order)}
            className="text-xs px-3 py-1 border border-teal-600 text-teal-700 rounded-md font-medium hover:bg-teal-50 flex items-center gap-1">
            Move to To Ship - To-Pack
          </button>
          
          {/* Details dropdown */}
          <div className="relative" data-actions-menu>
            <button
              type="button"
              className="text-xs px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 shadow-sm flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
              title="Details and options"
            >
              Details <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
                <button 
                  type="button" 
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" 
                  onClick={() => { setMenuOpen(false); onDetails?.(); }}
                >
                  👁️ View Details
                </button>
                <button 
                  type="button" 
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" 
                  onClick={() => { setMenuOpen(false); /* Add print functionality */ }}
                >
                  🖨️ Print Invoice
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmedOrdersView;
