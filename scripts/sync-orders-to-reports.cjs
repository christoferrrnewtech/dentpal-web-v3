/**
 * Sync existing orders to seller reports collection
 * This script creates pre-aggregated reports in Firestore
 * 
 * Structure: Seller/{sellerId}/reports/{orderId}
 * 
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   node scripts/sync-orders-to-reports.cjs
 */

const admin = require('firebase-admin');

function initAdmin() {
  if (admin.apps.length) return;
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT) {
      const path = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT;
      const sa = require(path);
      admin.initializeApp({ credential: admin.credential.cert(sa) });
      console.log('[init] Initialized with service account file:', path);
    } else {
      admin.initializeApp(); // Application Default Credentials
      console.log('[init] Initialized with Application Default Credentials');
    }
  } catch (e) {
    console.error('[init] Failed to initialize Firebase Admin:', e);
    process.exit(1);
  }
}

async function main() {
  initAdmin();
  const db = admin.firestore();
  const dryRun = !!process.env.DRY_RUN;

  console.log(`[sync-reports] ${dryRun ? '(DRY RUN) ' : ''}Starting sync...`);

  // Fetch all orders from both collections
  const orderCollections = ['Order', 'orders'];
  let totalOrders = 0;
  let syncedReports = 0;
  let skippedOrders = 0;

  for (const collectionName of orderCollections) {
    console.log(`[sync-reports] Processing collection: ${collectionName}`);
    
    const ordersSnap = await db.collection(collectionName).get();
    console.log(`[sync-reports] Found ${ordersSnap.size} orders in ${collectionName}`);
    totalOrders += ordersSnap.size;

    for (const orderDoc of ordersSnap.docs) {
      const order = orderDoc.data();
      const orderId = orderDoc.id;

      // Extract seller ID
      const sellerIds = Array.isArray(order.sellerIds) ? order.sellerIds : [];
      const sellerId = order.sellerId || sellerIds[0];

      if (!sellerId) {
        console.log(`[sync-reports] SKIP: Order ${orderId} has no seller ID`);
        skippedOrders++;
        continue;
      }

      // Calculate metrics
      const items = Array.isArray(order.items) ? order.items : [];
      const itemsSold = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      
      // Gross sales from order summary
      const grossSales = Number(order.summary?.subtotal || order.total || 0);
      
      // Check if order is refunded
      const status = String(order.status || '');
      const isRefunded = ['refunded', 'return_refund'].includes(status);
      const refunds = isRefunded ? grossSales : 0;
      const itemsRefunded = isRefunded ? itemsSold : 0;
      
      // Net sales = gross - refunds
      const netSales = grossSales - refunds;

      // Get timestamp
      const timestamp = order.timestamp || order.createdAt || new Date().toISOString();

      // Create report document
      const reportData = {
        orderId,
        grossSales,
        refunds,
        netSales,
        itemsSold,
        itemsRefunded,
        timestamp,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (dryRun) {
        console.log(`[sync-reports] Would sync: Seller/${sellerId}/reports/${orderId}`, reportData);
      } else {
        await db.collection('Seller').doc(sellerId).collection('reports').doc(orderId).set(reportData);
        console.log(`[sync-reports] Synced: Seller/${sellerId}/reports/${orderId} (₱${grossSales})`);
      }
      
      syncedReports++;
    }
  }

  console.log(`\n[sync-reports] ${dryRun ? '(DRY RUN) ' : ''}Summary:`);
  console.log(`  Total orders processed: ${totalOrders}`);
  console.log(`  Reports synced: ${syncedReports}`);
  console.log(`  Skipped (no seller): ${skippedOrders}`);
  console.log(`\n[sync-reports] Done!`);
}

main().catch(err => {
  console.error('[sync-reports] Error:', err);
  process.exit(1);
});
