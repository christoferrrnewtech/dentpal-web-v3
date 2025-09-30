import React from 'react';

interface HistoryFiltersProps {
  dateOptions: string[];
  reasonOptions: string[];
  onDateChange: (date: string) => void;
  onReasonChange: (reason: string) => void;
}

const HistoryFilters: React.FC<HistoryFiltersProps> = ({ dateOptions, reasonOptions, onDateChange, onReasonChange }) => {
  return (
    <div className="flex gap-4">
      <select
        onChange={(e) => onDateChange(e.target.value)}
        className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
      >
        <option value="">Select Date</option>
        {dateOptions.map((date, index) => (
          <option key={index} value={date}>{date}</option>
        ))}
      </select>

      <select
        onChange={(e) => onReasonChange(e.target.value)}
        className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
