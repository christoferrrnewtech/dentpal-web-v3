import React from 'react';

interface StatusFiltersProps {
  statusOptions: string[];
  onStatusChange: (status: string) => void;
}

const StatusFilters: React.FC<StatusFiltersProps> = ({ statusOptions, onStatusChange }) => {
  return (
    <div className="flex gap-4">
      <select
        onChange={(e) => onStatusChange(e.target.value)}
        className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white shadow-md hover:cursor-pointer"
      >
        <option value="" disabled hidden>Select Status</option>
        {statusOptions.map((status, index) => (
          <option key={index} value={status}>{status}</option>
        ))}
      </select>
    </div>
  );
};

export default StatusFilters;
