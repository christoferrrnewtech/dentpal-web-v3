/**
 * Browser-based sync utility for seller reports
 * Run this from browser console as an admin user
 */

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import ReportsService from '@/services/reports';

/**
 * Sync all existing orders to seller reports
 * Call this function from browser console: await syncAllOrdersToReports()
 */
export async function syncAllOrdersToReports() {
  console.log('[Sync] Starting sync of all orders to reports...');
  
  const orderCollections = ['Order', 'orders'];
  let totalOrders = 0;
  let syncedReports = 0;
  let skippedOrders = 0;
  let errors = 0;

  try {
    for (const collectionName of orderCollections) {
      console.log(`[Sync] Processing collection: ${collectionName}`);
      
      const ordersSnap = await getDocs(collection(db, collectionName));
      console.log(`[Sync] Found ${ordersSnap.size} orders in ${collectionName}`);
      totalOrders += ordersSnap.size;

      for (const orderDoc of ordersSnap.docs) {
        const order = orderDoc.data();
        const orderId = orderDoc.id;

        try {
          // Extract seller ID
          const sellerIds = Array.isArray(order.sellerIds) ? order.sellerIds : [];
          const sellerId = order.sellerId || sellerIds[0];

          if (!sellerId) {
            console.log(`[Sync] SKIP: Order ${orderId} has no seller ID`);
            skippedOrders++;
            continue;
          }

          // Use ReportsService to sync
          await ReportsService.syncOrderToReport({ ...order, id: orderId });
          
          syncedReports++;
          console.log(`[Sync] ✓ ${syncedReports}/${totalOrders}: Order ${orderId} synced for seller ${sellerId}`);
          
        } catch (error) {
          errors++;
          console.error(`[Sync] ✗ Error syncing order ${orderId}:`, error);
        }

        // Add small delay to avoid overwhelming Firestore
        if (syncedReports % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    console.log(`\n[Sync] ✅ Complete!`);
    console.log(`  Total orders processed: ${totalOrders}`);
    console.log(`  Reports synced: ${syncedReports}`);
    console.log(`  Skipped (no seller): ${skippedOrders}`);
    console.log(`  Errors: ${errors}`);
    
    return {
      success: true,
      totalOrders,
      syncedReports,
      skippedOrders,
      errors
    };
    
  } catch (error) {
    console.error('[Sync] Fatal error:', error);
    throw error;
  }
}

/**
 * Sync orders for a specific seller only
 */
export async function syncSellerReports(sellerId: string) {
  console.log(`[Sync] Syncing reports for seller: ${sellerId}`);
  
  const orderCollections = ['Order', 'orders'];
  let syncedCount = 0;

  try {
    for (const collectionName of orderCollections) {
      const ordersSnap = await getDocs(collection(db, collectionName));
      
      for (const orderDoc of ordersSnap.docs) {
        const order = orderDoc.data();
        const orderId = orderDoc.id;
        
        // Check if order belongs to this seller
        const sellerIds = Array.isArray(order.sellerIds) ? order.sellerIds : [];
        const orderSellerId = order.sellerId || sellerIds[0];
        
        if (orderSellerId === sellerId || sellerIds.includes(sellerId)) {
          await ReportsService.syncOrderToReport({ ...order, id: orderId });
          syncedCount++;
          console.log(`[Sync] ✓ Synced order ${orderId}`);
        }
      }
    }

    console.log(`[Sync] ✅ Synced ${syncedCount} orders for seller ${sellerId}`);
    return { success: true, syncedCount };
    
  } catch (error) {
    console.error('[Sync] Error:', error);
    throw error;
  }
}

// Make available globally in browser console
if (typeof window !== 'undefined') {
  (window as any).syncAllOrdersToReports = syncAllOrdersToReports;
  (window as any).syncSellerReports = syncSellerReports;
}
