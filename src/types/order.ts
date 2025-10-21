// Interface for order data structure
export interface Order {
  id: string;
  orderCount: number;
  barcode: string;
  timestamp: string; // Accrual basis date (order created date, YYYY-MM-DD)
  // New: full createdAt ISO timestamp to compute durations more precisely
  createdAt?: string; // ISO string e.g. 2024-09-09T08:30:00.000Z
  customer: {
    name: string;
    contact: string;
  };
  // Optional identifiers for reporting
  customerId?: string;
  sellerIds?: string[];
  // Region info derived from shipping address
  region?: {
    barangay?: string;
    municipality?: string;
    province?: string;
    zip?: string;
  };
  // New: seller display name (may be "Multiple Sellers" in admin view)
  sellerName?: string;
  // New: brief of items like "Product A x 2 + 1 more"
  itemsBrief?: string;
  // New: monetary total and currency
  total?: number;
  currency?: string;
  // New: payment type/method for reporting
  paymentType?: string;
  // New: payment transaction id and cash-basis timestamps
  paymentTxnId?: string;
  paidAt?: string; // Cash basis date (YYYY-MM-DD) or ISO if available
  refundedAt?: string; // Refund recognition date (YYYY-MM-DD) or ISO if available
  // New: breakdown amounts for accounting
  tax?: number;
  discount?: number;
  shipping?: number;
  fees?: number;
  // Costing
  cogs?: number;
  grossMargin?: number;
  // New: thumbnail of the first item purchased
  imageUrl?: string;
  // New: fulfillment lifecycle timestamps (ISO strings if present in Firestore)
  packedAt?: string; // when the order was packed / moved to to-ship
  handoverAt?: string; // when the parcel was handed over to courier
  deliveredAt?: string; // when the parcel was delivered/completed
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
    category?: string; // optional category label
    subcategory?: string; // optional subcategory label
    categoryId?: string; // optional category id reference
    cost?: number; // unit cost for COGS
  }>;
}

// Props for booking-related components
export interface BookingProps {
  // Add any props needed for booking functionality
}
