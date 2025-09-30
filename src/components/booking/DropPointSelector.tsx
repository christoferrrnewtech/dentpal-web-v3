import React from 'react';

interface DropPointSelectorProps {
  selectedHub: string;
  onHubSelect: (hubId: string) => void;
}

const mockHubs = [
  {
    id: 'jt-makati-1',
    name: 'J&T Express - Makati Branch 1',
    address: '123 Ayala Avenue, Makati City',
    distance: '2.3 km',
    operatingHours: '8:00 AM - 8:00 PM',
  },
  {
    id: 'jt-makati-2',
    name: 'J&T Express - Makati Branch 2',
    address: '456 Gil Puyat Avenue, Makati City',
    distance: '3.1 km',
    operatingHours: '9:00 AM - 7:00 PM',
  },
  {
    id: 'jt-bgc-1',
    name: 'J&T Express - BGC Branch',
    address: '789 26th Street, Bonifacio Global City',
    distance: '4.5 km',
    operatingHours: '8:00 AM - 9:00 PM',
  },
];

const DropPointSelector: React.FC<DropPointSelectorProps> = ({ selectedHub, onHubSelect }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Drop Point</h3>
        <p className="text-sm text-gray-500 mb-6">Choose the nearest J&T Express delivery hub</p>
      </div>
      
      <div className="space-y-4">
        {mockHubs.map((hub) => (
          <div
            key={hub.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedHub === hub.id
                ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => onHubSelect(hub.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <input
                    type="radio"
                    checked={selectedHub === hub.id}
                    onChange={() => onHubSelect(hub.id)}
                    className="mr-3 text-teal-600 focus:ring-teal-500"
                  />
                  <h4 className="text-sm font-medium text-gray-900">{hub.name}</h4>
                </div>
                <p className="text-sm text-gray-600 mt-1 ml-6">{hub.address}</p>
                <div className="flex items-center mt-2 ml-6 space-x-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {hub.distance}
                  </span>
                  <span className="text-xs text-gray-500">
                    Hours: {hub.operatingHours}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              The package will be delivered to your selected J&T Express hub. You'll receive a notification when it's ready for pickup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DropPointSelector;
