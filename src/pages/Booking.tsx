import { useState, useEffect, useMemo } from "react";
import { Order, BookingProps } from "../types/order.ts";
import ScanTab from "../components/booking/ScanTab";
import ProcessTab from "../components/booking/ProcessTab";
import CompletedTab from "../components/booking/CompletedTab";

const steps = ["scan", "process", "completed"] as const;
const stepLabels: Record<(typeof steps)[number], string> = {
  scan: "Scan",
  process: "To Process",
  completed: "Completed",
};

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

  const stepIndex = useMemo(() => steps.indexOf(activeTab as any), [activeTab]);
  const canNext = stepIndex < steps.length - 1;
  const canPrev = stepIndex > 0;
  const gotoNext = () => canNext && setActiveTab(steps[stepIndex + 1]);
  const gotoPrev = () => canPrev && setActiveTab(steps[stepIndex - 1]);

  return (
    <div className="space-y-6">
      {/* Booking Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">BOOKINGS</h2>
        </div>

        {/* Enhanced Stepper Navigation */}
        <div className="mb-8">
          {/* Progress Bar Background */}
          <div className="relative mb-8">
            <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 rounded-full"></div>
            <div 
              className="absolute top-5 left-0 h-1 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${(stepIndex / (steps.length - 1)) * 100}%` }}
            ></div>
            
            {/* Step Circles */}
            <ol className="flex items-center justify-between relative z-10">
              {steps.map((key, idx) => {
                const active = idx === stepIndex;
                const done = idx < stepIndex;
                const isClickable = true; // Allow clicking on any step
                
                return (
                  <li key={key} className="flex flex-col items-center">
                    <button
                      onClick={() => isClickable && setActiveTab(key)}
                      disabled={!isClickable}
                      className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                        done
                          ? "bg-teal-600 text-white border-teal-600 shadow-lg"
                          : active
                          ? "bg-white text-teal-700 border-teal-600 shadow-lg ring-4 ring-teal-100"
                          : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                      } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                      aria-current={active ? "step" : undefined}
                    >
                      {done ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                      
                      {/* Active Step Pulse Animation */}
                      {active && (
                        <div className="absolute inset-0 rounded-full border-2 border-teal-400 animate-ping"></div>
                      )}
                    </button>
                    
                    {/* Step Label */}
                    <div className="mt-3 text-center max-w-24">
                      <div className={`text-sm font-medium ${
                        active ? "text-teal-700" : done ? "text-teal-600" : "text-gray-500"
                      }`}>
                        {stepLabels[key]}
                      </div>
                      {active && (
                        <div className="text-xs text-gray-500 mt-1">Current Step</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center">
            <button
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                canPrev 
                  ? "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm" 
                  : "text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed"
              }`}
              onClick={gotoPrev}
              disabled={!canPrev}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>

            {/* Step Indicator */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="font-medium">Step {stepIndex + 1} of {steps.length}</span>
              <div className="w-px h-4 bg-gray-300"></div>
              <span className="text-teal-600 font-medium">{stepLabels[steps[stepIndex]]}</span>
            </div>

            <button
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                canNext 
                  ? "text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-sm" 
                  : "text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed"
              }`}
              onClick={gotoNext}
              disabled={!canNext}
            >
              <span>Next</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "scan" && (
          <ScanTab 
            onOrderScanned={handleOrderScanned}
            loading={loading}
            error={error}
            setError={setError}
            onTabChange={handleTabChange}
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
