/**
 * Reports Service
 * Handles pre-aggregated reports stored in Firestore for efficient querying
 * Structure: sellers/{sellerId}/reports/{orderId}
 */

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';

export interface SellerReport {
  orderId: string;
  grossSales: number;
  refunds: number;
  netSales: number;
  itemsSold: number;
  itemsRefunded: number;
  timestamp: string; // ISO date string from order
  createdAt?: Timestamp;
}

const ReportsService = {
  /**
   * Save or update a report entry for a specific order
   * @param sellerId - The seller's UID
   * @param orderId - The order ID
   * @param data - Report data to save
   */
  async saveOrderReport(sellerId: string, orderId: string, data: Omit<SellerReport, 'orderId'>): Promise<void> {
    const reportRef = doc(db, 'Seller', sellerId, 'reports', orderId);
    await setDoc(reportRef, {
      orderId,
      ...data,
      createdAt: Timestamp.now(),
    }, { merge: true });
  },

  /**
   * Get all reports for a seller (no date filtering at Firestore level)
   * Filtering by date should be done client-side using the timestamp field
   * @param sellerId - The seller's UID
   */
  async getSellerReports(sellerId: string): Promise<SellerReport[]> {
    const reportsCol = collection(db, 'Seller', sellerId, 'reports');
    const snapshot = await getDocs(reportsCol);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        orderId: doc.id,
        grossSales: Number(data.grossSales || 0),
        refunds: Number(data.refunds || 0),
        netSales: Number(data.netSales || 0),
        itemsSold: Number(data.itemsSold || 0),
        itemsRefunded: Number(data.itemsRefunded || 0),
        timestamp: String(data.timestamp || ''),
        createdAt: data.createdAt,
      } as SellerReport;
    });
  },

  /**
   * Calculate aggregated metrics from reports with client-side date filtering
   * @param reports - Array of seller reports
   * @param dateFrom - Start date (ISO string, optional)
   * @param dateTo - End date (ISO string, optional)
   */
  calculateMetrics(
    reports: SellerReport[],
    dateFrom?: string,
    dateTo?: string
  ): {
    totalGrossSales: number;
    totalRefunds: number;
    totalNetSales: number;
    totalItemsSold: number;
    totalItemsRefunded: number;
    transactionCount: number;
  } {
    // Filter by date if provided
    let filtered = reports;
    if (dateFrom || dateTo) {
      filtered = reports.filter(r => {
        if (!r.timestamp) return false;
        const reportDate = new Date(r.timestamp);
        if (dateFrom && reportDate < new Date(dateFrom)) return false;
        if (dateTo && reportDate > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      });
    }

    // Calculate totals
    return filtered.reduce(
      (acc, report) => ({
        totalGrossSales: acc.totalGrossSales + report.grossSales,
        totalRefunds: acc.totalRefunds + report.refunds,
        totalNetSales: acc.totalNetSales + report.netSales,
        totalItemsSold: acc.totalItemsSold + report.itemsSold,
        totalItemsRefunded: acc.totalItemsRefunded + report.itemsRefunded,
        transactionCount: acc.transactionCount + 1,
      }),
      {
        totalGrossSales: 0,
        totalRefunds: 0,
        totalNetSales: 0,
        totalItemsSold: 0,
        totalItemsRefunded: 0,
        transactionCount: 0,
      }
    );
  },

  /**
   * Generate report entry from order data
   * Call this whenever an order is created/updated to keep reports in sync
   * @param order - Order object with items and financial data
   */
  async syncOrderToReport(order: any): Promise<void> {
    // Extract seller ID from order
    const sellerIds = Array.isArray(order.sellerIds) ? order.sellerIds : [];
    const sellerId = order.sellerId || sellerIds[0];
    
    if (!sellerId || !order.id) {
      console.warn('[ReportsService] Missing seller ID or order ID, skipping sync');
      return;
    }

    // Calculate metrics from order
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsSold = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    
    // Gross sales from order summary
    const grossSales = Number(order.summary?.subtotal || 0);
    
    // Check if order is refunded
    const isRefunded = ['refunded', 'return_refund'].includes(order.status);
    const refunds = isRefunded ? grossSales : 0;
    const itemsRefunded = isRefunded ? itemsSold : 0;
    
    // Net sales = gross - refunds
    const netSales = grossSales - refunds;

    // Save to Firestore
    await this.saveOrderReport(sellerId, order.id, {
      grossSales,
      refunds,
      netSales,
      itemsSold,
      itemsRefunded,
      timestamp: order.timestamp || new Date().toISOString(),
    });

    console.log(`[ReportsService] Synced order ${order.id} to seller ${sellerId} reports`);
  },
};

export default ReportsService;
