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
  // New: seller display name (may be "Multiple Sellers" in admin view)
  sellerName?: string;
  // New: brief of items like "Product A x 2 + 1 more"
  itemsBrief?: string;
  // New: monetary total and currency
  total?: number;
  currency?: string;
  // New: thumbnail of the first item purchased
  imageUrl?: string;
  package: {
    size: 'small' | 'medium' | 'large';
    dimensions: string;
    weight: string;
  };
  priority: 'normal' | 'priority' | 'urgent';
  // Extended to support additional lifecycle stages in Seller Orders
  status: 'pending' | 'to-ship' | 'processing' | 'completed' | 'cancelled' | 'returned' | 'refunded' | 'return_refund' | 'failed-delivery';
  // New: full line items for invoices/exports
  items?: Array<{
    name: string;
    quantity: number;
    price?: number;
    productId?: string;
    sku?: string;
    imageUrl?: string;
  }>;
}

// Props for booking-related components
export interface BookingProps {
  // Add any props needed for booking functionality
}
