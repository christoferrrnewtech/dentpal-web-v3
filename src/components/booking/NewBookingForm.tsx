import React, { useState } from 'react';
import Stepper from './Stepper';
import SenderForm from './SenderForm';
import RecipientForm from './RecipientForm';
import DropPointSelector from './DropPointSelector';
import OrderDetailsForm from './OrderDetailsForm';
import OrderSummary from './OrderSummary';

interface BookingFormData {
  sender: {
    name: string;
    address: string;
    phone: string;
  };
  recipient: {
    name: string;
    address: string;
    phone: string;
  };
  dropPoint: string;
  orderDetails: {
    itemDescription: string;
    exclusiveDiscount: string;
    voucher: string;
  };
  termsAccepted: boolean;
}

const NewBookingForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<BookingFormData>({
    sender: { name: '', address: '', phone: '' },
    recipient: { name: '', address: '', phone: '' },
    dropPoint: '',
    orderDetails: { itemDescription: '', exclusiveDiscount: '', voucher: '' },
    termsAccepted: false,
  });

  const steps = ['Sender', 'Recipient', 'Drop Point', 'Order Details', 'Summary'];

  const updateSender = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      sender: { ...prev.sender, [field]: value }
    }));
  };

  const updateRecipient = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      recipient: { ...prev.recipient, [field]: value }
    }));
  };

  const updateOrderDetails = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      orderDetails: { ...prev.orderDetails, [field]: value }
    }));
  };

  const updateDropPoint = (hubId: string) => {
    setFormData(prev => ({ ...prev, dropPoint: hubId }));
  };

  const updateTerms = (accepted: boolean) => {
    setFormData(prev => ({ ...prev, termsAccepted: accepted }));
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Sender
        return !!(formData.sender.name && formData.sender.address && formData.sender.phone);
      case 1: // Recipient
        return !!(formData.recipient.name && formData.recipient.address && formData.recipient.phone);
      case 2: // Drop Point
        return !!formData.dropPoint;
      case 3: // Order Details
        return !!formData.orderDetails.itemDescription;
      case 4: // Summary
        return formData.termsAccepted;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1 && isStepValid(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    console.log('Submitting order:', formData);
    // Handle form submission
    alert('Order submitted successfully!');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <SenderForm data={formData.sender} onChange={updateSender} />;
      case 1:
        return <RecipientForm data={formData.recipient} onChange={updateRecipient} />;
      case 2:
        return <DropPointSelector selectedHub={formData.dropPoint} onHubSelect={updateDropPoint} />;
      case 3:
        return <OrderDetailsForm data={formData.orderDetails} onChange={updateOrderDetails} />;
      case 4:
        return (
          <OrderSummary
            estimatedCost="₱150.00"
            expectedDelivery="2-3 business days"
            requiredInfo={[
              'Valid sender and recipient information',
              'Complete delivery address',
              'Item description provided',
              'Drop point selected'
            ]}
            termsAccepted={formData.termsAccepted}
            onTermsChange={updateTerms}
            onSubmit={handleSubmit}
            isValid={isStepValid(4)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Booking</h1>
          <p className="text-gray-600">Complete the form below to create a new delivery booking</p>
        </div>

        <Stepper steps={steps} currentStep={currentStep} />

        <div className="min-h-[400px]">
          {renderCurrentStep()}
        </div>

        {currentStep < 4 && (
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`px-6 py-2 rounded-lg font-medium ${
                currentStep === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Previous
            </button>
            
            <button
              onClick={nextStep}
              disabled={!isStepValid(currentStep)}
              className={`px-6 py-2 rounded-lg font-medium ${
                isStepValid(currentStep)
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewBookingForm;
