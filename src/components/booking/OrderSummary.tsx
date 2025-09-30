import React from 'react';

interface OrderSummaryProps {
  estimatedCost: string;
  expectedDelivery: string;
  requiredInfo: string[];
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
  onSubmit: () => void;
  isValid: boolean;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  estimatedCost,
  expectedDelivery,
  requiredInfo,
  termsAccepted,
  onTermsChange,
  onSubmit,
  isValid
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Summary</h3>
        <p className="text-sm text-gray-500 mb-6">Review your order details before submission</p>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Estimated Cost:</span>
          <span className="text-lg font-semibold text-teal-600">{estimatedCost}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Expected Delivery:</span>
          <span className="text-sm text-gray-900">{expectedDelivery}</span>
        </div>
        
        <div>
          <span className="text-sm font-medium text-gray-700 block mb-2">Required Information:</span>
          <ul className="text-sm text-gray-600 space-y-1">
            {requiredInfo.map((info, index) => (
              <li key={index} className="flex items-center">
                <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {info}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => onTermsChange(e.target.checked)}
            className="mt-1 mr-3 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">
            I have read, understand and agreed to the{' '}
            <button className="text-teal-600 hover:text-teal-700 underline">
              terms and conditions
            </button>
          </span>
        </label>
      </div>
      
      <button
        onClick={onSubmit}
        disabled={!isValid || !termsAccepted}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          isValid && termsAccepted
            ? 'bg-teal-600 hover:bg-teal-700 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        Submit Order
      </button>
    </div>
  );
};

export default OrderSummary;
