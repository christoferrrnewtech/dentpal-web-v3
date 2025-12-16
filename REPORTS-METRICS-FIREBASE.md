# Reports Metrics - Firebase Storage Implementation

## Overview

This document explains how seller report metrics are automatically saved to Firebase.

## Firebase Structure

Metrics are saved to:

```
Seller/{sellerId}/reports/{reportId}
```

### Document Structure

```typescript
{
  grossSales: number,        // Total sales amount from all orders
  refunds: number,           // Total refund amount
  netSales: number,          // grossSales - refunds
  itemsSold: number,         // Total quantity of items sold
  itemsRefunded: number,     // Total quantity of items refunded
  dateRange: string,         // e.g., "last_30", "last_7", "custom:2024-12-01:2024-12-31"
  basis: string,             // "accrual" or "cash"
  calculatedAt: Timestamp,   // When metrics were calculated
  updatedAt: Timestamp       // When metrics were last updated
}
```

### Report ID Format

The `reportId` is constructed as: `{dateRange}-{basis}`

Examples:

- `last_30-accrual`
- `last_7-cash`
- `custom:2024-12-01:2024-12-31-accrual`

## How It Works

### 1. Automatic Calculation

- Metrics are calculated in real-time from orders in the Reports tab
- Uses existing calculation functions:
  - `sumGrossSales()` - Sums all order totals
  - `sumRefunds()` - Sums refunded order amounts
  - `sumItemsSold()` - Counts total items sold
  - `sumItemsRefunded()` - Counts total items refunded

### 2. Automatic Saving

- A `useEffect` hook monitors metric changes
- **Debounced**: Waits 2 seconds after last change before saving
- Saves to Firebase using `setDoc()` with `merge: true`
- Only runs for **seller accounts** (not admin)

### 3. Sub-account Support

- Sub-accounts save to their **parent seller's** reports collection
- Uses `parentId` when available, falls back to `uid`

## Code Location

### Implementation

File: `src/components/reports/ReportsTab.tsx`

Lines: ~553-596 (after the totals calculation)

### Key Features

- **Debounced saves**: Prevents excessive Firebase writes
- **Merge strategy**: Updates existing documents without overwriting
- **Error handling**: Logs errors without breaking the UI
- **Conditional saving**: Only saves for sellers, not admins

## Usage Example

When a seller views their Reports tab:

1. **Initial Load**

   - Orders are fetched from Firebase
   - Metrics are calculated from orders
   - Metrics are saved to `Seller/{sellerId}/reports/last_30-accrual`

2. **Filter Change** (e.g., change date range to "Last 7 days")

   - Metrics recalculate
   - After 2 seconds, saves to `Seller/{sellerId}/reports/last_7-accrual`

3. **Basis Change** (e.g., switch from Accrual to Cash)
   - Metrics recalculate with cash basis
   - Saves to `Seller/{sellerId}/reports/last_7-cash`

## Benefits

1. **Quick Access**: Metrics are pre-calculated and stored
2. **Historical Data**: Can track metrics over time
3. **Performance**: No need to recalculate from all orders
4. **Dashboard Integration**: Dashboard can read from `reports/` collection
5. **No Conflicts**: Reports tab is display-only, no existing storage

## Future Enhancements

Potential improvements:

1. Add trend analysis (compare current vs previous period)
2. Store breakdown by category/brand/item
3. Add scheduled recalculation (daily/weekly)
4. Create analytics dashboard from historical reports
5. Add export functionality from stored reports

## Notes

- Metrics update **automatically** when orders change (via OrdersService listener)
- No manual save button needed
- Storage is efficient due to debouncing
- Uses Firebase Timestamp for accurate timing
- Fully backward compatible (no breaking changes)
