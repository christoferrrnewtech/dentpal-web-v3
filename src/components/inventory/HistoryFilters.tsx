import React from 'react';

interface HistoryFiltersProps {
  // Optional now; dateOptions kept for backward compatibility but not used
  dateOptions?: string[];
  reasonOptions?: string[];
  onDateChange: (date: string) => void;
  onReasonChange: (reason: string) => void;
}

const HistoryFilters: React.FC<HistoryFiltersProps> = ({ reasonOptions = [], onDateChange, onReasonChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date picker (compact) */}
      <input
        type="date"
        onChange={(e) => onDateChange(e.target.value)}
        className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent w-44"
      />

      {/* Reason select (compact) */}
      <select
        onChange={(e) => onReasonChange(e.target.value)}
        className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent w-48"
      >
        <option value="">Select Reason</option>
        {reasonOptions.map((reason, index) => (
          <option key={index} value={reason}>{reason}</option>
        ))}
      </select>
    </div>
  );
};

export default HistoryFilters;
