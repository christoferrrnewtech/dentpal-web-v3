# Seller Reports System - Technical Documentation

## Overview

The Seller Reports system provides pre-aggregated sales metrics stored in Firestore for efficient dashboard querying. Instead of calculating metrics on-the-fly from orders, we store aggregated data that can be filtered by date on the frontend.

## Firestore Structure

```
Seller/{sellerId}/reports/{orderId}
  ├─ orderId: string           # Reference to the order
  ├─ grossSales: number        # Total sales (subtotal from order.summary)
  ├─ refunds: number           # Refund amount (gross sales if refunded)
  ├─ netSales: number          # Gross sales - refunds
  ├─ itemsSold: number         # Total quantity of items
  ├─ itemsRefunded: number     # Quantity refunded
  ├─ timestamp: string         # ISO date from order (for client-side filtering)
  └─ createdAt: Timestamp      # When report was created
```

## Key Design Decisions

### 1. **No Date Filtering at Firestore Level**

- Reports are stored with `timestamp` field but no Firestore query filters
- Date filtering happens on the **frontend** using the `timestamp` field
- This allows flexible date range filtering without complex Firestore indexes

### 2. **Order ID as Document ID**

- Each report document uses the order ID as its Firestore document ID
- This makes it easy to update reports when orders change
- Prevents duplicate reports for the same order

### 3. **Pre-Aggregated Metrics**

- Stores only 5 core metrics: `grossSales`, `refunds`, `netSales`, `itemsSold`, `itemsRefunded`
- Additional metrics (fees, shipping) calculated from matching orders in memory
- Keeps Firestore documents small and queries fast

## Usage

### Dashboard Integration

```typescript
// 1. Load all reports for seller (no date filter)
const reports = await ReportsService.getSellerReports(sellerId);

// 2. Filter by date range on frontend
const filteredReports = reports.filter((r) =>
  withinLastDays(r.timestamp, "last-30")
);

// 3. Calculate totals
const totalGross = filteredReports.reduce((sum, r) => sum + r.grossSales, 0);
```

### Syncing Orders to Reports

Reports are automatically synced when:

- Order status changes (via `OrdersService.updateOrderStatus`)
- Order is created or updated

Manual sync:

```typescript
await ReportsService.syncOrderToReport(order);
```

### Backfilling Existing Orders

Run the sync script to populate reports for existing orders:

```bash
# Dry run (see what would be synced)
DRY_RUN=1 node scripts/sync-orders-to-reports.cjs

# Actual sync
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
node scripts/sync-orders-to-reports.cjs
```

## Admin Filter Workflow

### Admin Dashboard Filters

- **Province Filter**: Filter sellers by location
- **City Filter**: Multi-select cities within province
- **Date Range Filter**: Client-side filtering using report timestamps
- **Shop Name Filter**: Filter by specific seller

### Export Table

For admin export table, the flow is:

1. Load all sellers
2. For each seller, load their reports
3. Apply date range filter on frontend
4. Calculate aggregated metrics
5. Display in table

```typescript
const sellerMetrics = sellers.map((seller) => {
  const reports = await ReportsService.getSellerReports(seller.uid);
  const metrics = ReportsService.calculateMetrics(
    reports,
    adminFilters.dateFrom,
    adminFilters.dateTo
  );
  return {
    seller,
    ...metrics,
  };
});
```

## Performance Benefits

### Before (Complex Firestore Queries)

```typescript
// ❌ Slow: Query all orders, filter by seller, date, status
const orders = await getDocs(
  query(
    collection(db, "Order"),
    where("sellerId", "==", sellerId),
    where("timestamp", ">=", startDate),
    where("timestamp", "<=", endDate),
    where("status", "in", ["to_ship", "processing", "completed"])
  )
);
// Then calculate totals in memory
```

### After (Pre-Aggregated Reports)

```typescript
// ✅ Fast: Load pre-aggregated reports, filter in memory
const reports = await ReportsService.getSellerReports(sellerId);
const filtered = reports.filter((r) => withinLastDays(r.timestamp, "last-30"));
const total = filtered.reduce((sum, r) => sum + r.grossSales, 0);
```

## Data Consistency

### When Orders Update

Orders are automatically synced to reports via `OrdersService.updateOrderStatus`:

```typescript
await updateDoc(docRef, updateData);

// Auto-sync to reports
const ReportsService = (await import("./reports")).default;
await ReportsService.syncOrderToReport(updatedOrder);
```

### Handling Refunds

When an order status changes to `refunded` or `return_refund`:

- `refunds` = `grossSales`
- `itemsRefunded` = `itemsSold`
- `netSales` = 0

## Migration Path

### Step 1: Run Backfill Script

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
node scripts/sync-orders-to-reports.cjs
```

### Step 2: Update Dashboard

Dashboard now uses `sellerReports` state instead of calculating from raw orders:

- ✅ Fast loading (pre-aggregated)
- ✅ Flexible date filtering (client-side)
- ✅ No complex Firestore indexes needed

### Step 3: Monitor Sync

Future orders automatically sync when status changes. Check logs for:

```
[ReportsService] Synced order ABC123 to seller XYZ reports
```

## Future Enhancements

### Real-Time Updates

Consider adding Firestore listeners for live updates:

```typescript
listenSellerReports(sellerId, callback) {
  return onSnapshot(
    collection(db, 'Seller', sellerId, 'reports'),
    (snapshot) => {
      const reports = snapshot.docs.map(doc => doc.data());
      callback(reports);
    }
  );
}
```

### Additional Metrics

Can extend report structure with:

- `averageOrderValue: number`
- `transactionCount: number`
- `categoryBreakdown: Record<string, number>`

### Caching Layer

Add Redis/memory cache for frequently accessed metrics:

```typescript
const cached = await cache.get(`reports:${sellerId}:last-30`);
if (cached) return cached;
```

## Troubleshooting

### Dashboard Shows ₱0.00

1. Check if reports exist: `await ReportsService.getSellerReports(sellerId)`
2. Verify timestamp format matches ISO string
3. Run backfill script if reports are missing

### Reports Out of Sync

1. Re-run backfill script
2. Check order status update logs
3. Verify `syncOrderToReport` is being called

### Date Filtering Not Working

1. Verify `timestamp` field format (should be ISO string)
2. Check `withinLastDays` logic
3. Inspect filtered reports count in console logs
