import React from 'react';
import { Order } from '@/types/order';
import OrderRow from '../parts/OrderRow';

interface ViewProps { 
  orders: Order[]; 
  onSelectOrder?: (o: Order) => void; 
  onMoveToArrangement?: (order: Order) => void; 
  onMoveToHandOver?: (order: Order) => void; // new
  onConfirmHandover?: (order: Order) => void; // new
}

const ToShipOrdersView: React.FC<ViewProps> = ({ orders, onSelectOrder, onMoveToArrangement, onMoveToHandOver, onConfirmHandover }) => (
  <div className="space-y-4">
    {orders.map(o => (
      <OrderRow 
        key={o.id} 
        order={o} 
        onDetails={() => onSelectOrder?.(o)} 
        isToShip={true} 
        onMoveToArrangement={onMoveToArrangement}
        onMoveToHandOver={onMoveToHandOver}
        onConfirmHandover={onConfirmHandover}
      />
    ))}
  </div>
);

export default ToShipOrdersView;
