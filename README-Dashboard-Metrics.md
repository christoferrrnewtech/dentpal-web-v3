# Dashboard Financial Metrics - Simple Approach

## How It Works

The Dashboard now calculates financial metrics **directly from orders** that are already being fetched from Firebase - the same way the Reports tab does it.

### No Pre-Aggregation Needed ✅

Instead of creating a separate reports collection, we:

1. **Fetch orders** via `OrdersService.listenBySeller(uid)` (already happening)
2. **Filter by date** using the `sellerFilters.dateRange` (last-7, last-30, etc.)
3. **Calculate totals** from `order.summary.subtotal` and other fields
4. **Display metrics** in the Dashboard KPI cards

### Key Benefits

✅ **No extra Firestore collections** - uses existing Order data  
✅ **Real-time updates** - metrics update as orders change  
✅ **Same logic as Reports tab** - consistent calculations  
✅ **No manual sync needed** - everything is automatic

## Implementation Details

### Financial Metrics Calculation

```typescript
const financialMetrics = useMemo(() => {
  let totalGross = 0;
  let totalNetPayout = 0;
  let totalPaymentProcessingFee = 0;
  let totalPlatformFee = 0;
  let totalShippingCharge = 0;

  confirmationOrders.forEach((order) => {
    // Only PAID orders (same as Reports tab)
    if (!isPaidStatus(order.status)) return;

    // Apply date filter
    if (!withinLastDays(order.timestamp, sellerFilters.dateRange)) return;

    // Extract from order.summary
    const subtotal = order.summary?.subtotal || 0;
    totalGross += subtotal;

    // Extract fees and payout
    totalPaymentProcessingFee += order.feesBreakdown?.paymentProcessingFee || 0;
    totalPlatformFee += order.feesBreakdown?.platformFee || 0;
    totalShippingCharge += order.summary?.sellerShippingCharge || 0;
    totalNetPayout += order.payout?.netPayoutToSeller || 0;
  });

  return {
    totalGross,
    totalNetPayout,
    totalPaymentProcessingFee,
    totalPlatformFee,
    totalShippingCharge,
  };
}, [confirmationOrders, sellerFilters.dateRange]);
```

### Order Data Structure

Orders are fetched with this structure:

```typescript
{
  id: string,
  status: 'pending' | 'to_ship' | 'processing' | 'completed' | ...,
  timestamp: string, // ISO date for filtering
  summary: {
    subtotal: number,           // Gross Sales
    sellerShippingCharge: number,
    total: number
  },
  feesBreakdown: {
    paymentProcessingFee: number,
    platformFee: number
  },
  payout: {
    netPayoutToSeller: number   // Net Payout
  }
}
```

### Date Filtering

Same logic as Reports tab:

```typescript
const withinLastDays = (timestamp: string, range: string) => {
  const date = new Date(timestamp);
  const today = new Date();
  const days =
    range === "last-7"
      ? 7
      : range === "last-30"
      ? 30
      : range === "last-90"
      ? 90
      : 30;
  const from = new Date(today.getTime() - (days - 1) * 86400000);
  return date >= from && date <= today;
};
```

### Paid Orders Filter

Only count paid orders:

```typescript
const isPaidStatus = (status) => {
  return ["to_ship", "processing", "completed"].includes(status);
};
```

## What Happens When

### On Page Load

1. Dashboard subscribes to orders via `OrdersService.listenBySeller(uid)`
2. Orders are stored in `confirmationOrders` state
3. `financialMetrics` useMemo calculates totals from orders
4. KPI cards display the metrics

### When Date Filter Changes

1. User selects new date range (e.g., "Last 7 days")
2. `sellerFilters.dateRange` updates
3. `financialMetrics` recalculates (only includes orders in range)
4. Dashboard updates automatically

### When New Order Comes In

1. Firebase triggers the order listener
2. `confirmationOrders` updates with new order
3. `financialMetrics` recalculates including new order
4. Dashboard shows updated totals

## Comparison with Reports Tab

Both Dashboard and Reports tab now use **identical logic**:

| Feature       | Dashboard                                  | Reports Tab                  |
| ------------- | ------------------------------------------ | ---------------------------- |
| Data Source   | `confirmationOrders`                       | `orders` (same subscription) |
| Date Filter   | `sellerFilters.dateRange`                  | Custom date range            |
| Status Filter | PAID only (to_ship, processing, completed) | Same                         |
| Gross Sales   | `order.summary.subtotal`                   | Same                         |
| Net Payout    | `order.payout.netPayoutToSeller`           | Same                         |

## Troubleshooting

### Dashboard Shows ₱0.00

**Check:**

1. Are orders being fetched? Check console: `[Dashboard] Received orders (seller): X`
2. Do orders have `summary.subtotal`? Check order structure in Firebase
3. Are orders in the date range? Check `order.timestamp` values
4. Are orders PAID status? Check `order.status` (should be to_ship, processing, or completed)

**Debug:**

```javascript
// In browser console
console.log("[Debug] Orders:", confirmationOrders);
console.log("[Debug] Date range:", sellerFilters.dateRange);
console.log("[Debug] Financial metrics:", financialMetrics);
```

### Different from Reports Tab

If Dashboard and Reports show different numbers:

1. Check if both are using the same date range
2. Verify both are filtering by PAID status only
3. Check console logs for calculation details

## Future Enhancements

If you need better performance later:

- Add Firestore indexes for faster order queries
- Implement pagination for sellers with many orders
- Cache calculations in memory for frequently accessed ranges

But for now, this simple approach works perfectly! ✅
