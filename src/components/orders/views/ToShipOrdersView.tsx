import React from 'react';
import { Order } from '@/types/order';
import OrderRow from '../parts/OrderRow';

interface ViewProps { 
  orders: Order[]; 
  onSelectOrder?: (o: Order) => void; 
  onMoveToArrangement?: (order: Order) => void; 
  onMoveToHandOver?: (order: Order) => void; 
  onConfirmHandover?: (order: Order) => void; 
  onMoveToPack?: (order: Order) => void; // Move back from arrangement to pack
  onMoveToShipping?: (order: Order) => void; // Move from hand-over to shipping
  shippingLoading?: string | null; // Order ID currently being processed for shipping
}

const ToShipOrdersView: React.FC<ViewProps> = ({ orders, onSelectOrder, onMoveToArrangement, onMoveToHandOver, onConfirmHandover, onMoveToPack, onMoveToShipping, shippingLoading }) => (
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
        onMoveToPack={onMoveToPack}
        onMoveToShipping={onMoveToShipping}
        isShippingLoading={shippingLoading === o.id}
      />
    ))}
  </div>
);

export default ToShipOrdersView;
