import React from 'react';
import type { Address } from '../../types/booking';

interface PartyView {
  name: string;
  phone: string;
  address: Address;
}

interface OrderDetailsView {
  itemDescription: string;
  exclusiveDiscount: string;
  voucher: string;
}

interface OrderSummaryProps {
  sender: PartyView;
  recipient: PartyView;
  dropPoint: string;
  orderDetails: OrderDetailsView;
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
  onSubmit: () => void;
  isValid: boolean;
}

const formatAddress = (a: Address) =>
  [a.houseNumber, a.street, `Brgy. ${a.barangay}`, a.city, a.province, a.zipCode]
    .filter(Boolean)
    .join(', ');

const SummaryRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between items-start py-2">
    <span className="text-sm font-medium text-gray-600">{label}</span>
    <div className="text-sm text-gray-900 text-right whitespace-pre-wrap max-w-[70%]">{value}</div>
  </div>
);

const OrderSummary: React.FC<OrderSummaryProps> = ({
  sender,
  recipient,
  dropPoint,
  orderDetails,
  termsAccepted,
  onTermsChange,
  onSubmit,
  isValid,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Review & Confirm</h3>
        <p className="text-sm text-gray-500 mb-4">Double-check the details below before submission.</p>
      </div>

      {/* Sender and Recipient */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Sender</h4>
          <SummaryRow label="Name" value={sender.name} />
          <SummaryRow label="Phone" value={sender.phone} />
          <SummaryRow label="Address" value={formatAddress(sender.address)} />
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Recipient</h4>
          <SummaryRow label="Name" value={recipient.name} />
          <SummaryRow label="Phone" value={recipient.phone} />
          <SummaryRow label="Address" value={formatAddress(recipient.address)} />
        </div>
      </div>

      {/* Drop point + Order details */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
        <SummaryRow label="Drop Point" value={dropPoint} />
        <SummaryRow label="Item" value={orderDetails.itemDescription} />
        {orderDetails.exclusiveDiscount && (
          <SummaryRow label="Exclusive Discount" value={orderDetails.exclusiveDiscount} />
        )}
        {orderDetails.voucher && (
          <SummaryRow label="Voucher" value={orderDetails.voucher} />
        )}
      </div>

      {/* Terms */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => onTermsChange(e.target.checked)}
            className="mt-1 mr-3 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">
            I have reviewed the information and agree to the terms and conditions.
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
