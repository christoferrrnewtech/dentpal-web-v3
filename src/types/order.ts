// Interface for order data structure
export interface Order {
  id: string;
  orderCount: number;
  barcode: string;
  timestamp: string;
  customer: {
    name: string;
    contact: string;
  };
  package: {
    size: 'small' | 'medium' | 'large';
    dimensions: string;
    weight: string;
  };
  priority: 'normal' | 'priority' | 'urgent';
  // Extended to support additional lifecycle stages in Seller Orders
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'returned' | 'refunded' | 'return_refund' | 'failed-delivery';
}

// Props for booking-related components
export interface BookingProps {
  // Add any props needed for booking functionality
}
