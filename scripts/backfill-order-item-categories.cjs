/*
 Backfill Order.items[].category and .subcategory from Product documents.
 Usage:
   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccount.json
   npm run backfill:categories
 Options:
   DRY_RUN=1 npm run backfill:categories  -> only logs changes
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
      admin.initializeApp(); // ADC
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

  const productCache = new Map();
  async function getProduct(pid) {
    if (!pid) return null;
    if (productCache.has(pid)) return productCache.get(pid);
    try {
      const snap = await db.collection('Product').doc(String(pid)).get();
      if (!snap.exists) {
        productCache.set(pid, null);
        return null;
      }
      const p = snap.data() || {};
      const out = {
        category: p.category || p.Category || null,
        subcategory: p.subcategory || p.Subcategory || null,
      };
      productCache.set(pid, out);
      return out;
    } catch (e) {
      console.warn('[product] fetch failed', pid, e.message);
      productCache.set(pid, null);
      return null;
    }
  }

  console.log('[backfill] Scanning Order collection...');
  const snap = await db.collection('Order').get();
  console.log(`[backfill] Found ${snap.size} orders`);

  let changedDocs = 0;
  let changedItems = 0;
  let batch = db.batch();
  let ops = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0) continue;

    let updated = false;
    const newItems = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      const hasCategory = it.category && typeof it.category === 'string' && it.category.trim();
      const hasSubcategory = it.subcategory && typeof it.subcategory === 'string' && it.subcategory.trim();
      if (hasCategory && hasSubcategory) {
        newItems.push(it);
        continue;
      }
      const pid = it.productId || it.productID || (it.product && it.product.id);
      const p = await getProduct(pid);
      if (p && (p.category || p.subcategory)) {
        const merged = { ...it, ...(p.category && !hasCategory ? { category: String(p.category) } : {}), ...(p.subcategory && !hasSubcategory ? { subcategory: String(p.subcategory) } : {}) };
        newItems.push(merged);
        updated = true;
        changedItems++;
      } else {
        // still uncategorized
        newItems.push(it);
      }
    }

    if (updated) {
      changedDocs++;
      if (dryRun) {
        console.log(`[dry-run] Would update Order/${doc.id} items categories`);
      } else {
        batch.update(doc.ref, { items: newItems });
        ops++;
        if (ops >= 450) { // keep under 500
          await batch.commit();
          console.log('[backfill] Committed 450 updates');
          batch = db.batch();
          ops = 0;
        }
      }
    }
  }

  if (!dryRun && ops > 0) {
    await batch.commit();
  }

  console.log(`[backfill] Done. ${dryRun ? '(dry run) ' : ''}Updated ${changedDocs} orders, ${changedItems} items.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
