/**
 * One-time migration: Move web_users -> Seller
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   npx ts-node scripts/migrate-web_users-to-Seller.ts
 */
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function migrate() {
  const src = 'web_users';
  const dst = 'Seller';

  console.log(`Reading from ${src} ...`);
  const snap = await db.collection(src).get();
  console.log(`Found ${snap.size} docs`);

  let moved = 0, updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const destRef = db.collection(dst).doc(doc.id);
    const destSnap = await destRef.get();

    const payload = {
      ...data,
      _migratedFrom: src,
      _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!destSnap.exists) {
      await destRef.set(payload, { merge: true });
      moved++;
    } else {
      await destRef.set(payload, { merge: true });
      updated++;
    }
  }

  console.log(`Done. moved: ${moved}, updated: ${updated}`);
}

migrate().catch(err => { console.error(err); process.exit(1); });
