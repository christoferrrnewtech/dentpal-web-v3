import { useState, useEffect } from "react";
import { Order, BookingProps } from "../types/order.ts";
import ScanTab from "../components/booking/ScanTab";
import ProcessTab from "../components/booking/ProcessTab";
import CompletedTab from "../components/booking/CompletedTab";

const Booking = ({}: BookingProps) => {
  const [activeTab, setActiveTab] = useState("scan");
  
  // Dynamic state for orders
  const [ordersToProcess, setOrdersToProcess] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data - will be replaced with API calls
  const mockOrdersToProcess: Order[] = [
    {
      id: "DP-2024-001",
      orderCount: 2,
      barcode: "1234567890",
      timestamp: "2024-09-09T08:00:00Z",
      customer: { name: "John Dental Clinic", contact: "+63 912 345 6789" },
      package: { size: "medium", dimensions: "15cm × 10cm × 8cm", weight: "0.5kg" },
      priority: "priority",
      status: "pending"
    },
    {
      id: "DP-2024-002", 
      orderCount: 1,
      barcode: "0987654321",
      timestamp: "2024-09-09T06:00:00Z",
      customer: { name: "Smile Dental Care", contact: "+63 917 654 3210" },
      package: { size: "small", dimensions: "10cm × 8cm × 5cm", weight: "0.2kg" },
      priority: "normal",
      status: "pending"
    },
    {
      id: "DP-2024-003",
      orderCount: 1, 
      barcode: "1122334455",
      timestamp: "2024-09-09T04:00:00Z",
      customer: { name: "Perfect Teeth Clinic", contact: "+63 908 111 2233" },
      package: { size: "large", dimensions: "20cm × 15cm × 12cm", weight: "1.2kg" },
      priority: "urgent",
      status: "pending"
    },
    {
      id: "DP-2024-004",
      orderCount: 3,
      barcode: "5566778899", 
      timestamp: "2024-09-09T02:00:00Z",
      customer: { name: "Bright Smile Dental", contact: "+63 915 987 6543" },
      package: { size: "medium", dimensions: "15cm × 10cm × 8cm", weight: "0.7kg" },
      priority: "normal",
      status: "pending"
    }
  ];

  // Mock completed orders data
  const mockCompletedOrders: Order[] = [
    {
      id: "DP-2024-101",
      orderCount: 1,
      barcode: "9876543210",
      timestamp: "2024-09-08T14:30:00Z",
      customer: { name: "Elite Dental Clinic", contact: "+63 920 123 4567" },
      package: { size: "small", dimensions: "10cm × 8cm × 5cm", weight: "0.3kg" },
      priority: "normal",
      status: "completed"
    },
    {
      id: "DP-2024-102",
      orderCount: 2,
      barcode: "1357924680",
      timestamp: "2024-09-08T16:45:00Z", 
      customer: { name: "Modern Dental Solutions", contact: "+63 917 987 6543" },
      package: { size: "medium", dimensions: "15cm × 10cm × 8cm", weight: "0.6kg" },
      priority: "priority",
      status: "completed"
    },
    {
      id: "DP-2024-103",
      orderCount: 3,
      barcode: "2468013579",
      timestamp: "2024-09-07T10:15:00Z",
      customer: { name: "Family Dental Care", contact: "+63 908 555 1234" },
      package: { size: "large", dimensions: "20cm × 15cm × 12cm", weight: "1.1kg" },
      priority: "urgent",
      status: "completed"
    },
    {
      id: "DP-2024-104",
      orderCount: 1,
      barcode: "3691472580",
      timestamp: "2024-09-07T13:20:00Z",
      customer: { name: "Advanced Orthodontics", contact: "+63 915 777 8888" },
      package: { size: "medium", dimensions: "15cm × 10cm × 8cm", weight: "0.4kg" },
      priority: "normal",
      status: "completed"
    },
    {
      id: "DP-2024-105",
      orderCount: 2,
      barcode: "1472583690",
      timestamp: "2024-09-06T11:10:00Z",
      customer: { name: "City Dental Group", contact: "+63 912 444 5555" },
      package: { size: "small", dimensions: "10cm × 8cm × 5cm", weight: "0.2kg" },
      priority: "normal", 
      status: "completed"
    }
  ];



  // Simulate initial data load (replace with useEffect + API call)
  useEffect(() => {
    if (activeTab === "process" && ordersToProcess.length === 0) {
      setLoading(true);
      // Simulate API call delay
      setTimeout(() => {
        setOrdersToProcess(mockOrdersToProcess);
        setLoading(false);
      }, 1000);
    }
    
    if (activeTab === "completed" && completedOrders.length === 0) {
      setLoading(true);
      // Simulate API call delay
      setTimeout(() => {
        setCompletedOrders(mockCompletedOrders);
        setLoading(false);
      }, 800);
    }


  }, [activeTab]);

  // Handler for when a new order is scanned
  const handleOrderScanned = (newOrder: Order) => {
    setOrdersToProcess(prev => [newOrder, ...prev]);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setError(null);
  };

  const handlePrintWaybill = async (orderId: string) => {
    setLoading(true);
    try {
      // TODO: API call to print waybill
      // await fetch(`/api/orders/${orderId}/print-waybill`, { method: 'POST' });
      console.log(`Printing waybill for order ${orderId}`);
    } catch (err) {
      setError("Failed to print waybill. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (orderId: string) => {
    setLoading(true);
    try {
      // TODO: API call to mark order as complete
      // await fetch(`/api/orders/${orderId}/complete`, { method: 'PUT' });
      
      const orderToComplete = ordersToProcess.find(order => order.id === orderId);
      if (orderToComplete) {
        const completedOrder = { ...orderToComplete, status: 'completed' as const };
        setCompletedOrders(prev => [completedOrder, ...prev]);
        setOrdersToProcess(prev => prev.filter(order => order.id !== orderId));
      }
      setError(null);
    } catch (err) {
      setError("Failed to mark order as complete. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAll = async () => {
    setLoading(true);
    try {
      // TODO: API call to process all orders
      // await fetch('/api/orders/process-all', { method: 'POST' });
      
      const allCompleted = ordersToProcess.map(order => ({ ...order, status: 'completed' as const }));
      setCompletedOrders(prev => [...allCompleted, ...prev]);
      setOrdersToProcess([]);
      setError(null);
    } catch (err) {
      setError("Failed to process all orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };



  const handleExport = async (format: string) => {
    setLoading(true);
    try {
      // TODO: API call to export data
      // await fetch(`/api/orders/export?format=${format}`, { method: 'GET' });
      console.log(`Exporting completed orders as ${format.toUpperCase()}`);
      
      // Simulate file download
      const fileName = `completed-orders-${new Date().toISOString().split('T')[0]}.${format}`;
      console.log(`Downloaded: ${fileName}`);
      setError(null);
    } catch (err) {
      setError(`Failed to export as ${format.toUpperCase()}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (orderId: string) => {
    setLoading(true);
    try {
      // TODO: API call to get order details or navigate to details page
      // const response = await fetch(`/api/orders/${orderId}/details`);
      console.log(`Viewing details for order ${orderId}`);
      setError(null);
    } catch (err) {
      setError("Failed to load order details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (orderId: string) => {
    setLoading(true);
    try {
      // TODO: API call to download invoice PDF
      // const response = await fetch(`/api/orders/${orderId}/invoice`, { method: 'GET' });
      console.log(`Downloading invoice for order ${orderId}`);
      
      // Simulate file download
      const fileName = `invoice-${orderId}.pdf`;
      console.log(`Downloaded: ${fileName}`);
      setError(null);
    } catch (err) {
      setError("Failed to download invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Booking Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">BOOKINGS</h2>
        </div>

        {/* Process Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6">
          <button 
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "scan" 
                ? "text-white bg-teal-600" 
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => handleTabChange("scan")}
          >
            SCAN
          </button>
          <button 
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "process" 
                ? "text-white bg-teal-600" 
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => handleTabChange("process")}
          >
            TO PROCESS
          </button>
          <button 
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "completed" 
                ? "text-white bg-teal-600" 
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => handleTabChange("completed")}
          >
            COMPLETED
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "scan" && (
          <ScanTab 
            onOrderScanned={handleOrderScanned}
            loading={loading}
            error={error}
            setError={setError}
          />
        )}

        {activeTab === "process" && (
          <ProcessTab 
            orders={ordersToProcess}
            loading={loading}
            error={error}
            setError={setError}
            onPrintWaybill={handlePrintWaybill}
            onMarkComplete={handleMarkComplete}
            onProcessAll={handleProcessAll}
            onTabChange={handleTabChange}
          />
        )}



        {activeTab === "completed" && (
          <CompletedTab 
            orders={completedOrders}
            loading={loading}
            error={error}
            setError={setError}
            onExport={handleExport}
            onViewDetails={handleViewDetails}
            onDownloadInvoice={handleDownloadInvoice}
            onTabChange={handleTabChange}
          />
        )}
      </div>
    </div>
  );
};

export default Booking;
