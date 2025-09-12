import { useState } from "react";
import { Order } from "../../types/order.ts";

interface ScanTabProps {
  onOrderScanned: (order: Order) => void;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

const ScanTab = ({ onOrderScanned, loading, error, setError }: ScanTabProps) => {
  const [orderCount, setOrderCount] = useState("");
  const [barcode, setBarcode] = useState("");
  const [startDate, setStartDate] = useState("2024-08-05");
  const [endDate, setEndDate] = useState("2024-09-09");

  const handleAddItem = async () => {
    if (orderCount && barcode) {
      try {
        // TODO: API call to add scanned item
        // const response = await fetch('/api/orders/scan', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ orderCount: parseInt(orderCount), barcode })
        // });
        
        console.log("Adding item:", { orderCount, barcode });
        
        // Simulate successful addition - create new order for processing
        const newOrder: Order = {
          id: `DP-2024-${String(Date.now()).slice(-3)}`,
          orderCount: parseInt(orderCount),
          barcode,
          timestamp: new Date().toISOString(),
          customer: { name: "New Customer", contact: "+63 XXX XXX XXXX" },
          package: { size: "medium", dimensions: "15cm × 10cm × 8cm", weight: "0.5kg" },
          priority: "normal",
          status: "pending"
        };
        
        onOrderScanned(newOrder);
        setOrderCount("");
        setBarcode("");
        setError(null);
      } catch (err) {
        setError("Failed to add item. Please try again.");
      }
    }
  };

  const handleClearInputs = () => {
    setOrderCount("");
    setBarcode("");
    setError(null);
  };

  return (
    <>
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Scanning Interface */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            [ORDER_COUNT]
          </label>
          <input
            type="text"
            value={orderCount}
            onChange={(e) => setOrderCount(e.target.value)}
            placeholder="Enter order count"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            *INPUT BARCODE HERE*
          </label>
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan or enter barcode"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
          />
        </div>
        
        <div className="flex space-x-2 pt-7">
          <button 
            onClick={handleAddItem}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Adding..." : "ADD"}
          </button>
          <button 
            onClick={handleClearInputs}
            className="px-6 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
          >
            CLEAR
          </button>
        </div>
      </div>

      {/* Scanned Items List */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Scanned Items</h3>
          <div className="flex items-center space-x-4">
            {/* Date Range Picker */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Date Range:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <span className="text-sm text-gray-500">0 items processed</span>
          </div>
        </div>
        
        {/* Items Table Header */}
        <div className="bg-gray-50 rounded-t-xl px-6 py-3 border-b border-gray-200">
          <div className="grid grid-cols-6 gap-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
            <span>TIMESTAMP</span>
            <span>ORDER ID</span>
            <span>SELLER</span>
            <span>ACCESS (ORDERS == "YES")</span>
            <span>CONTACT NO</span>
            <span>SELLER ID + PRODUCT ID + BARCODE NUMBER</span>
          </div>
        </div>
        
        {/* Items List */}
        <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 min-h-[300px]">
          <div className="p-8 text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium mb-2">No items scanned yet</p>
            <p className="text-sm">Start scanning barcodes to populate this list</p>
            <p className="text-xs mt-2 text-gray-400">
              Items will appear here as: TIMESTAMP | ORDER ID | SELLER | ACCESS (ORDERS == "YES") | CONTACT NO | SELLER ID + PRODUCT ID + BARCODE NUMBER
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ScanTab;
