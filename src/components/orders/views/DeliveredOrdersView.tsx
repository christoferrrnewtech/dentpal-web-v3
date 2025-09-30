import React from 'react';
import { Order } from '@/types/order';
import OrderRow from '../parts/OrderRow';

interface ViewProps { orders: Order[]; onSelectOrder?: (o: Order) => void; }
const DeliveredOrdersView: React.FC<ViewProps> = ({ orders, onSelectOrder }) => (
  <div className="space-y-4">{orders.map(o => <OrderRow key={o.id} order={o} onClick={() => onSelectOrder?.(o)} />)}</div>
);
export default DeliveredOrdersView;
