import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export type Option = { value: string; label: string };

export const COMPLIANCE_DEFAULTS: {
  dangerousGoods: Option[];
  warrantyTypes: Option[];
  durations: Option[];
} = {
  dangerousGoods: [
    { value: 'none', label: 'None' },
    { value: 'dangerous', label: 'Contains Battery / Flammable / Liquid' },
  ],
  warrantyTypes: [
    { value: 'local_manufacturer', label: 'Local Manufacturer Warranty' },
    { value: 'intl_manufacturer', label: 'International Manufacturer Warranty' },
    { value: 'local_supplier', label: 'Local Supplier Warranty' },
    { value: 'local_supplier_refund', label: 'Local Supplier Refund Warranty' },
    { value: 'none', label: 'No warranty' },
    { value: 'intl_seller', label: 'International Seller Warranty' },
  ],
  durations: [
    { value: '1w', label: '1 week' },
    { value: '2w', label: '2 weeks' },
    { value: '1m', label: '1 month' },
    { value: '2m', label: '2 months' },
    { value: '3m', label: '3 months' },
    { value: '11m', label: '11 months' },
    { value: '30y', label: '30 years' },
  ],
};

const COLL = 'WarrantyandCompliance';

export type ComplianceOptions = {
  dangerousGoods: Option[];
  warrantyTypes: Option[];
  durations: Option[];
};

const normalize = (v: any): Option[] => {
  if (!v) return [];
  if (Array.isArray(v)) {
    // If stored as array of strings, convert to label=value form
    if (typeof v[0] === 'string') return v.map((s) => ({ value: String(s), label: String(s) }));
    return v as Option[];
  }
  if (Array.isArray(v?.options)) {
    const arr = v.options;
    if (typeof arr[0] === 'string') return arr.map((s: any) => ({ value: String(s), label: String(s) }));
    return arr as Option[];
  }
  return [];
};

export const ComplianceService = {
  // Listen to compliance options (updates in real-time)
  listen(cb: (opts: ComplianceOptions) => void) {
    // seed with defaults
    let current: ComplianceOptions = { ...COMPLIANCE_DEFAULTS };
    cb(current);

    const unsubDG = onSnapshot(doc(db, COLL, 'DangerousGoods'), (snap) => {
      if (snap.exists()) {
        current = { ...current, dangerousGoods: normalize(snap.data()) };
        cb(current);
      }
    });
    const unsubWT = onSnapshot(doc(db, COLL, 'WarrantyType'), (snap) => {
      if (snap.exists()) {
        current = { ...current, warrantyTypes: normalize(snap.data()) };
        cb(current);
      }
    });
    const unsubWD = onSnapshot(doc(db, COLL, 'WarrantyDuration'), (snap) => {
      if (snap.exists()) {
        current = { ...current, durations: normalize(snap.data()) };
        cb(current);
      }
    });
    return () => { unsubDG(); unsubWT(); unsubWD(); };
  },
};

export default ComplianceService;
