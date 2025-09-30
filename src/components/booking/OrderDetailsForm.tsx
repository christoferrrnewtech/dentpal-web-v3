import React from 'react';

interface OrderDetailsFormProps {
  data: {
    itemDescription: string;
    exclusiveDiscount: string;
    voucher: string;
  };
  onChange: (field: string, value: string) => void;
}

const OrderDetailsForm: React.FC<OrderDetailsFormProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Details</h3>
        <p className="text-sm text-gray-500 mb-6">Please provide item description and discount information</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Item Description *
          </label>
          <textarea
            value={data.itemDescription}
            onChange={(e) => onChange('itemDescription', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Describe the items being shipped (e.g., Dental supplies, impression materials, etc.)"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exclusive Discount (Optional)
          </label>
          <input
            type="text"
            value={data.exclusiveDiscount}
            onChange={(e) => onChange('exclusiveDiscount', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Enter discount code or percentage"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voucher Code (Optional)
          </label>
          <input
            type="text"
            value={data.voucher}
            onChange={(e) => onChange('voucher', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Enter voucher code"
          />
        </div>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Important:</strong> Official Receipt will be available within seven days. You may claim the OR in our branch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsForm;
