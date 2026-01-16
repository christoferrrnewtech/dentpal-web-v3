// Category and subcategory options
export const CATEGORY_OPTIONS = ['Consumables', 'Dental Equipment', 'Disposables', 'Equipment'] as const;

export const SUBCATEGORY_OPTIONS: Record<typeof CATEGORY_OPTIONS[number], string[]> = {
  Consumables: [
    'Bonding Agents',
    'Cements',
    'Cleaning Solutions',
    'Endodontic materials',
    'Fillings',
    'Impression materials',
    'Orthodontic Materials',
    'Polishing Agents',
    'Restorative materials',
    'Sealants',
    'Temporary materials',
  ],
  'Dental Equipment': ['Tools'],
  Disposables: ['Clinical Waste', 'Instrument and Tools', 'Patient Care Items', 'Protective Wear'],
  Equipment: [
    'Curing light',
    'Dental Chairs and Units',
    'Diagnostic Equipment',
    'Handpieces and Tools',
    'Impression Equipment',
    'Orthodontic Equipments',
    'Prosthodentics Equipments',
    'Sterilization Equipment',
    'Ultrasonic Cleaners',
  ],
};

// TODO: replace with real Category IDs when available
export const CATEGORY_NAME_TO_ID: Record<string, string> = {
  'Disposables': 'EsDNnmc72LZNMHk3SmeV',
  'Dental Equipment': 'PtqCTLGduo6vay2umpMY',
  'Consumables': 'iXMJ7vcFIcMjQBVfIHZp',
  'Equipment': 'z5BRrsDIy92XEK1PzdM4',
  'Equipments': 'z5BRrsDIy92XEK1PzdM4',
};

export const SUBCATEGORY_NAME_TO_ID: Record<string, string> = {
  // TODO: replace with real subcategory IDs when available
  'Bonding Agents': 'OEtF1TsohK0Re8RT9rOf',
};

export type ItemStatus = 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted';
