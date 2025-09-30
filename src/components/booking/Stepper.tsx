import React from 'react';

interface StepperProps {
  steps: string[];
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
            index <= currentStep 
              ? 'bg-teal-500 border-teal-500 text-white' 
              : 'bg-white border-gray-300 text-gray-400'
          }`}>
            <span className="text-sm font-medium">{index + 1}</span>
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${
              index <= currentStep ? 'text-teal-600' : 'text-gray-400'
            }`}>
              {step}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-4 ${
              index < currentStep ? 'bg-teal-500' : 'bg-gray-300'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};

export default Stepper;
