import React, { useMemo, useState } from 'react';

interface OrderDetailsFormProps {
  data: {
    itemDescription: string;
    exclusiveDiscount: string;
    voucher: string;
  };
  onChange: (field: string, value: string) => void;
}

const ITEM_OPTIONS = [
  'Dental supplies',
  'Impression materials',
  'Aligners',
  'Crowns/Bridges',
  'Orthodontic materials',
  'Instruments',
  'PPE',
  'Documents',
];

const DISCOUNT_OPTIONS = ['None', '5%', '10%', '15%', '20%'];
const VOUCHER_OPTIONS = ['None', 'WELCOME10', 'FREESHIP', 'VIP20'];

const OrderDetailsForm: React.FC<OrderDetailsFormProps> = ({ data, onChange }) => {
  const isCustomItem = useMemo(
    () => !!data.itemDescription && !ITEM_OPTIONS.includes(data.itemDescription),
    [data.itemDescription]
  );
  const [showDiscounts, setShowDiscounts] = useState(
    Boolean(data.exclusiveDiscount || data.voucher)
  );
  const [useCustomItem, setUseCustomItem] = useState(isCustomItem);

  const selectedItemValue = useCustomItem
    ? 'OTHER'
    : data.itemDescription || '';

  const handleItemChange = (val: string) => {
    if (val === 'OTHER') {
      setUseCustomItem(true);
      // Do not set itemDescription yet; wait for custom input
      return;
    }
    setUseCustomItem(false);
    onChange('itemDescription', val);
  };

  const handleDiscountChange = (val: string) => {
    onChange('exclusiveDiscount', val === 'None' ? '' : val);
  };

  const handleVoucherChange = (val: string) => {
    onChange('voucher', val === 'None' ? '' : val);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Details</h3>
        <p className="text-sm text-gray-500 mb-6">Select item and optional discount information</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Item Description *
          </label>
          <div className="flex flex-col gap-3">
            <select
              value={selectedItemValue}
              onChange={(e) => handleItemChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
            >
              <option value="" disabled>
                Select item category
              </option>
              {ITEM_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value="OTHER">Other (specify)</option>
            </select>

            {useCustomItem && (
              <input
                type="text"
                value={isCustomItem ? data.itemDescription : ''}
                onChange={(e) => onChange('itemDescription', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Type custom item description"
              />)
            }
          </div>
        </div>

        {/* Optional discounts section */}
        <div className="border border-gray-200 rounded-lg">
          <button
            type="button"
            onClick={() => setShowDiscounts((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-medium text-gray-700">Discounts and Vouchers (Optional)</span>
            <svg
              className={`h-5 w-5 text-gray-500 transform transition-transform ${
                showDiscounts ? 'rotate-180' : ''
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {showDiscounts && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exclusive Discount
                </label>
                <select
                  value={data.exclusiveDiscount || 'None'}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                >
                  {DISCOUNT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voucher Code
                </label>
                <select
                  value={data.voucher || 'None'}
                  onChange={(e) => handleVoucherChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                >
                  {VOUCHER_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
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
