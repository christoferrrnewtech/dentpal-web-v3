# 🦷 DentPal Database Structure & Data Flow Understanding

## 📋 Overview

This document outlines the complete database structure needed for the DentPal web application based on frontend component analysis. The application uses **Firebase Firestore** as the primary database.

## 🏗️ Database Architecture

### Core Collections Structure

```
dentpal_db/
├── web_users/          # Admin & Staff Users
├── customers/          # Dental Office Customers
├── orders/            # Package Orders & Deliveries
├── transactions/      # Financial Transactions
├── withdrawals/       # Payout Requests
├── analytics/         # Business Intelligence Data
├── notifications/     # System Notifications
└── settings/          # Application Configuration
```

---

## 📊 Collection Details

### 1. 🔐 **web_users** Collection

**Purpose**: Authentication & admin panel access
**Used by**: `AuthService`, `Dashboard.tsx`, `UsersTab.tsx`

```typescript
interface WebUser {
  uid: string; // Firebase Auth UID
  email: string; // Login email
  name: string; // Full name
  role: "admin" | "user" | "dentist" | "staff";
  createdAt: Date; // Account creation
  isActive: boolean; // Account status
  phone?: string; // Contact number
  avatar?: string; // Profile image URL
  lastLogin?: Date; // Last access time
  permissions?: string[]; // Role-based permissions
}
```

**Sample Data**:

```javascript
{
  "uid": "admin123",
  "email": "admin@gmail.com",
  "name": "Admin User",
  "role": "admin",
  "createdAt": "2025-09-10T00:00:00Z",
  "isActive": true,
  "lastLogin": "2025-09-10T08:30:00Z",
  "permissions": ["manage_users", "view_analytics", "process_withdrawals"]
}
```

---

### 2. 👥 **customers** Collection

**Purpose**: Dental office customer management
**Used by**: `UsersTab.tsx`, `Dashboard.tsx` (user stats)

```typescript
interface Customer {
  customerId: string; // Unique customer ID
  firstName: string; // Customer first name
  lastName: string; // Customer last name
  email: string; // Contact email
  phone: string; // Phone number
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  membershipLevel: "bronze" | "silver" | "gold" | "platinum";
  rewardPoints: number; // Loyalty points balance
  totalOrders: number; // Order history count
  totalSpent: number; // Lifetime value
  isActive: boolean; // Account status
  createdAt: Date; // Registration date
  lastOrderDate?: Date; // Most recent order
  notes?: string; // Admin notes
}
```

**Sample Data**:

```javascript
{
  "customerId": "CUST001",
  "firstName": "Dr. Sarah",
  "lastName": "Johnson",
  "email": "sarah@dentalcare.com",
  "phone": "+1-555-0123",
  "address": {
    "street": "123 Medical Plaza",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90210",
    "country": "USA"
  },
  "membershipLevel": "gold",
  "rewardPoints": 2500,
  "totalOrders": 45,
  "totalSpent": 12750.00,
  "isActive": true,
  "createdAt": "2024-01-15T00:00:00Z",
  "lastOrderDate": "2025-09-08T14:30:00Z"
}
```

---

### 3. 📦 **orders** Collection

**Purpose**: Package delivery management  
**Used by**: `Dashboard.tsx`, `RecentOrders.tsx`, `Booking.tsx`

```typescript
interface Order {
  orderId: string; // Unique order identifier
  barcode: string; // Tracking barcode
  customerId: string; // Reference to customer
  customerName: string; // Customer display name
  customerEmail: string; // Contact email

  // Package Details
  packageDetails: {
    type: "express" | "standard" | "bulk";
    weight: number; // In pounds/kg
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    description: string; // Contents description
    specialInstructions?: string;
  };

  // Delivery Information
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  // Order Status & Tracking
  status: "pending" | "confirmed" | "in-transit" | "delivered" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";

  // Timestamps
  orderDate: Date;
  estimatedDelivery: Date;
  actualDelivery?: Date;

  // Financial
  subtotal: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  paymentMethod: "credit_card" | "debit_card" | "paypal" | "bank_transfer";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";

  // Tracking
  trackingHistory: {
    status: string;
    location: string;
    timestamp: Date;
    notes?: string;
  }[];

  // Additional
  notes?: string;
  createdBy: string; // Staff member who created order
  isActive: boolean;
}
```

**Sample Data**:

```javascript
{
  "orderId": "ORD-2025-001234",
  "barcode": "1234567890128",
  "customerId": "CUST001",
  "customerName": "Dr. Sarah Johnson",
  "customerEmail": "sarah@dentalcare.com",
  "packageDetails": {
    "type": "express",
    "weight": 2.5,
    "dimensions": { "length": 12, "width": 8, "height": 6 },
    "description": "Dental supplies - crowns and bridges",
    "specialInstructions": "Handle with care - fragile items"
  },
  "status": "in-transit",
  "priority": "high",
  "orderDate": "2025-09-09T10:00:00Z",
  "estimatedDelivery": "2025-09-11T16:00:00Z",
  "totalAmount": 245.75,
  "paymentMethod": "credit_card",
  "paymentStatus": "paid",
  "trackingHistory": [
    {
      "status": "Order Created",
      "location": "DentPal Warehouse",
      "timestamp": "2025-09-09T10:00:00Z"
    },
    {
      "status": "In Transit",
      "location": "Los Angeles Distribution Center",
      "timestamp": "2025-09-09T18:30:00Z"
    }
  ]
}
```

---

### 4. 💰 **transactions** Collection

**Purpose**: Financial transaction tracking
**Used by**: `RevenueChart.tsx`, `Dashboard.tsx` analytics

```typescript
interface Transaction {
  transactionId: string; // Unique transaction ID
  orderId?: string; // Related order (if applicable)
  customerId?: string; // Related customer

  // Transaction Details
  type: "order_payment" | "refund" | "fee" | "adjustment" | "withdrawal";
  amount: number; // Transaction amount
  currency: "USD"; // Currency code

  // Payment Information
  paymentMethod:
    | "credit_card"
    | "debit_card"
    | "paypal"
    | "bank_transfer"
    | "cash";
  paymentGateway?: "stripe" | "paypal" | "square";
  gatewayTransactionId?: string;

  // Status & Processing
  status: "pending" | "completed" | "failed" | "cancelled";
  processedAt?: Date;

  // Metadata
  description: string; // Transaction description
  createdAt: Date;
  createdBy: string; // Staff member who processed

  // Financial Breakdown
  fees?: {
    processingFee: number;
    platformFee: number;
    totalFees: number;
  };

  netAmount?: number; // Amount after fees
  notes?: string;
}
```

---

### 5. 🏦 **withdrawals** Collection

**Purpose**: Payout request management
**Used by**: `WithdrawalTab.tsx`, `Dashboard.tsx`

```typescript
interface Withdrawal {
  withdrawalId: string; // Unique withdrawal ID
  requestedBy: string; // User who requested

  // Amount Details
  requestedAmount: number;
  availableBalance: number;
  processingFee: number;
  netAmount: number;

  // Bank Details
  bankDetails: {
    accountName: string;
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    accountType: "checking" | "savings";
  };

  // Status & Processing
  status: "pending" | "approved" | "processing" | "completed" | "rejected";
  requestDate: Date;
  approvedDate?: Date;
  processedDate?: Date;
  approvedBy?: string; // Admin who approved

  // Additional Info
  reason?: string; // Reason for withdrawal
  rejectionReason?: string; // If rejected
  notes?: string;

  // Transaction Reference
  transactionId?: string; // Related transaction after processing
}
```

---

### 6. 📈 **analytics** Collection

**Purpose**: Business intelligence & reporting  
**Used by**: `Dashboard.tsx`, `RevenueChart.tsx`, `StatsCard.tsx`

```typescript
interface DailyAnalytics {
  date: string; // YYYY-MM-DD format

  // Revenue Metrics
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;

  // Payment Methods Breakdown
  paymentMethods: {
    creditCard: number;
    debitCard: number;
    paypal: number;
    bankTransfer: number;
  };

  // Order Status Distribution
  ordersByStatus: {
    pending: number;
    confirmed: number;
    inTransit: number;
    delivered: number;
    cancelled: number;
  };

  // Customer Metrics
  newCustomers: number;
  returningCustomers: number;

  // Geographic Data
  ordersByState: Record<string, number>;

  // Performance Metrics
  deliveryPerformance: {
    onTime: number;
    delayed: number;
    averageDeliveryTime: number; // in hours
  };

  createdAt: Date;
  updatedAt: Date;
}
```

---

### 7. 🔔 **notifications** Collection

**Purpose**: System notifications & alerts
**Used by**: Dashboard notification system

```typescript
interface Notification {
  notificationId: string;
  userId?: string; // Target user (null = broadcast)
  type:
    | "order_update"
    | "payment_received"
    | "withdrawal_approved"
    | "system_alert";
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string; // Link to relevant page
  metadata?: Record<string, any>; // Additional data
}
```

---

### 8. ⚙️ **settings** Collection

**Purpose**: Application configuration
**Used by**: Global app settings

```typescript
interface AppSettings {
  settingId: string;
  category: "general" | "payments" | "shipping" | "notifications";
  key: string;
  value: any;
  description: string;
  isEditable: boolean;
  updatedBy: string;
  updatedAt: Date;
}
```

---

## 🔄 Data Flow Patterns

### 1. **Order Creation Flow**

```
Customer Places Order → orders/ → transactions/ → analytics/ → notifications/
```

### 2. **Payment Processing Flow**

```
Payment Gateway → transactions/ → orders/ (status update) → analytics/
```

### 3. **Dashboard Analytics Flow**

```
analytics/ ← aggregation ← orders/ + transactions/ + customers/
```

### 4. **User Management Flow**

```
web_users/ ↔ Authentication ↔ Role-Based Access
```

---

## 📊 Key Metrics & KPIs

### Dashboard Statistics (StatsCard.tsx)

- **Total Revenue**: Sum from `transactions/` where type='order_payment' and status='completed'
- **Active Orders**: Count from `orders/` where status in ['pending', 'confirmed', 'in-transit']
- **Total Users**: Count from `customers/` where isActive=true
- **Pending Withdrawals**: Count from `withdrawals/` where status='pending'

### Revenue Analytics (RevenueChart.tsx)

- **Daily Revenue**: Aggregated from `analytics/` collection
- **Payment Method Distribution**: From `analytics.paymentMethods`
- **Order Status Trends**: From `analytics.ordersByStatus`
- **Geographic Performance**: From `analytics.ordersByState`

---

## 🔐 Security & Access Control

### Collection Security Rules (Firestore)

```javascript
// web_users: Admin-only access
match /web_users/{userId} {
  allow read, write: if request.auth != null &&
    get(/databases/$(database)/documents/web_users/$(request.auth.uid)).data.role == 'admin';
}

// customers: Admin and staff access
match /customers/{customerId} {
  allow read, write: if request.auth != null &&
    get(/databases/$(database)/documents/web_users/$(request.auth.uid)).data.role in ['admin', 'staff'];
}

// orders: Role-based access
match /orders/{orderId} {
  allow read, write: if request.auth != null &&
    get(/databases/$(database)/documents/web_users/$(request.auth.uid)).data.role in ['admin', 'staff'];
}
```

---

## 🚀 Implementation Priorities

### Phase 1: Core Collections

1. ✅ `web_users` - Already implemented
2. 🔄 `customers` - Customer management
3. 🔄 `orders` - Order processing
4. 🔄 `transactions` - Payment tracking

### Phase 2: Advanced Features

5. 📊 `analytics` - Business intelligence
6. 🏦 `withdrawals` - Payout system
7. 🔔 `notifications` - Real-time alerts
8. ⚙️ `settings` - Configuration management

---

## 📝 Sample Queries

### Common Dashboard Queries

```typescript
// Get recent orders
const recentOrders = await getDocs(
  query(collection(db, "orders"), orderBy("orderDate", "desc"), limit(10))
);

// Get daily revenue
const today = new Date().toISOString().split("T")[0];
const analytics = await getDoc(doc(db, "analytics", today));

// Get pending withdrawals
const pendingWithdrawals = await getDocs(
  query(collection(db, "withdrawals"), where("status", "==", "pending"))
);
```

---

## 🎯 Next Steps

1. **Create Firestore Collections**: Set up all collections with sample data
2. **Implement Data Services**: Create service classes for each collection
3. **Connect Frontend Components**: Update components to use real data
4. **Add Security Rules**: Configure Firestore security rules
5. **Set up Real-time Listeners**: Enable live data updates
6. **Implement Analytics Aggregation**: Create scheduled functions for analytics

---

_This documentation serves as the complete reference for understanding the DentPal database structure and data relationships. All frontend components have been analyzed to ensure comprehensive coverage of data requirements._
