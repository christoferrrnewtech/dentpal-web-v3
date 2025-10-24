// Seed Warranty & Compliance options into Firestore
// Usage: node scripts/seed-warranty-compliance.js

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error('Missing Firebase env vars. Please set VITE_FIREBASE_* environment variables.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLL = 'WarrantyandCompliance';

async function seed() {
  console.log('Seeding Warranty & Compliance options...');

  const dangerousGoods = {
    options: [
      { value: 'none', label: 'None' },
      { value: 'dangerous', label: 'Contains Battery / Flammable / Liquid' },
    ],
    updatedAt: Date.now(),
  };

  const warrantyType = {
    options: [
      'Local Manufacturer Warranty',
      'International Manufacturer Warranty',
      'Local Supplier Warranty',
      'Local Supplier Refund Warranty',
      'No warranty',
      'International Seller Warranty',
    ],
    updatedAt: Date.now(),
  };

  const warrantyDuration = {
    options: [
      '1 week',
      '2 weeks',
      '1 month',
      '2 months',
      '3 months',
      '11 months',
      '30 years',
    ],
    updatedAt: Date.now(),
  };

  await setDoc(doc(db, COLL, 'DangerousGoods'), dangerousGoods, { merge: true });
  await setDoc(doc(db, COLL, 'WarrantyType'), warrantyType, { merge: true });
  await setDoc(doc(db, COLL, 'WarrantyDuration'), warrantyDuration, { merge: true });

  console.log('Done.');
}

seed().catch((e) => {
  console.error('Seed failed', e);
  process.exit(1);
});
