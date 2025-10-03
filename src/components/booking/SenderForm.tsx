import React from 'react';
import type { Address } from '../../types/booking';

interface SenderFormProps {
  data: {
    name: string;
    address: Address;
    phone: string;
  };
  onChange: (field: string, value: any) => void;
}

const SenderForm: React.FC<SenderFormProps> = ({ data, onChange }) => {
  const handlePhoneChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    onChange('phone', digits);
  };

  const phoneValid = data.phone.length === 0 || /^09\d{9}$/.test(data.phone);

  const updateAddress = (field: keyof Address, value: string) => {
    onChange('address', { ...data.address, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sender Information</h3>
        <p className="text-sm text-gray-500 mb-6">Please provide the sender's details</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Enter sender's full name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            inputMode="numeric"
            pattern="^09\\d{9}$"
            maxLength={11}
            value={data.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
              phoneValid ? 'border-gray-300' : 'border-red-400'
            }`}
            placeholder="09XXXXXXXXX"
            aria-invalid={!phoneValid}
          />
          {!phoneValid && (
            <p className="mt-1 text-sm text-red-600">Phone must start with 09 and be exactly 11 digits.</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">House/Unit No. *</label>
            <input
              type="text"
              value={data.address.houseNumber}
              onChange={(e) => updateAddress('houseNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., 123-A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Street *</label>
            <input
              type="text"
              value={data.address.street}
              onChange={(e) => updateAddress('street', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., Desert Rose St."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Barangay *</label>
            <input
              type="text"
              value={data.address.barangay}
              onChange={(e) => updateAddress('barangay', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., Sambat"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City/Municipality *</label>
            <input
              type="text"
              value={data.address.city}
              onChange={(e) => updateAddress('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., San Pascual"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Province *</label>
            <input
              type="text"
              value={data.address.province}
              onChange={(e) => updateAddress('province', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., Batangas"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={data.address.zipCode}
              onChange={(e) => updateAddress('zipCode', e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., 4204"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SenderForm;
