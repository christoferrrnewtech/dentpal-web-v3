import React from 'react';

interface SenderFormProps {
  data: {
    name: string;
    address: string;
    phone: string;
  };
  onChange: (field: string, value: string) => void;
}

const SenderForm: React.FC<SenderFormProps> = ({ data, onChange }) => {
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
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="+63 XXX XXX XXXX"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complete Address *
          </label>
          <textarea
            value={data.address}
            onChange={(e) => onChange('address', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="House/Unit Number, Street, Barangay, City, Province, ZIP Code"
          />
        </div>
      </div>
    </div>
  );
};

export default SenderForm;
