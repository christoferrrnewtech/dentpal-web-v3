import { useState, useEffect } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentOrders from "@/components/dashboard/RecentOrders";
import RevenueChart from "@/components/dashboard/RevenueChart";
import Booking from "@/pages/Booking";
import ConfirmationTab from "@/components/confirmation/ConfirmationTab";
import WithdrawalTab from "@/components/withdrawal/WithdrawalTab";
import AccessTab from "@/components/access/AccessTab";
import ImagesTab from "@/components/images/ImagesTab";
import UsersTab from "@/components/users/UsersTab";
import { Order } from "@/types/order";
import { DollarSign, Users, ShoppingCart, TrendingUp } from "lucide-react";
// Add permission-aware auth hook
import { useAuth } from "@/hooks/use-auth";

interface DashboardProps {
  user: { name?: string; email: string };
  onLogout: () => void;
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeItem, setActiveItem] = useState("dashboard");
  const { hasPermission, loading: authLoading } = useAuth();

  // Map page ids to permission keys stored in Firestore
  const permissionByMenuId: Record<string, keyof ReturnType<typeof useAuth>["permissions"] | 'dashboard'> = {
    dashboard: "dashboard",
    booking: "bookings",
    confirmation: "confirmation",
    withdrawal: "withdrawal",
    access: "access",
    images: "images",
    users: "users",
  } as any;

  const isAllowed = (itemId: string) => hasPermission((permissionByMenuId[itemId] || 'dashboard') as any);

  // Ensure active tab is permitted; otherwise jump to first allowed
  useEffect(() => {
    if (authLoading) return;
    if (!isAllowed(activeItem)) {
      const order = ["dashboard", "booking", "confirmation", "withdrawal", "access", "images", "users"];
      const firstAllowed = order.find((id) => isAllowed(id));
      if (firstAllowed) setActiveItem(firstAllowed);
    }
  }, [authLoading, activeItem]);

  // Mock data for confirmation page
  const [confirmationOrders, setConfirmationOrders] = useState<Order[]>([
    {
      id: "DP-2024-005",
      orderCount: 3,
      barcode: "2345678901",
      timestamp: "2024-09-09T08:30:00Z",
      customer: { name: "Perfect Smile Dental", contact: "+63 917 123 4567" },
      package: { size: "medium" as const, dimensions: "15cm × 10cm × 8cm", weight: "0.7kg" },
      priority: "urgent" as const,
      status: "processing" as const
    },
    {
      id: "DP-2024-006",
      orderCount: 1,
      barcode: "3456789012",
      timestamp: "2024-09-09T09:15:00Z",
      customer: { name: "Bright Teeth Clinic", contact: "+63 917 234 5678" },
      package: { size: "small" as const, dimensions: "10cm × 8cm × 5cm", weight: "0.3kg" },
      priority: "priority" as const,
      status: "processing" as const
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handlers for confirmation actions
  const handleConfirmOrder = async (orderId: string) => {
    setLoading(true);
    try {
      // TODO: API call to confirm order
      console.log(`Confirming order ${orderId}`);
      // Remove from confirmation list (simulate move to completed)
      setConfirmationOrders(prev => prev.filter(order => order.id !== orderId));
      setError(null);
    } catch (err) {
      setError("Failed to confirm order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    setLoading(true);
    try {
      // TODO: API call to reject order
      console.log(`Rejecting order ${orderId}`);
      // Remove from confirmation list
      setConfirmationOrders(prev => prev.filter(order => order.id !== orderId));
      setError(null);
    } catch (err) {
      setError("Failed to reject order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportConfirmations = async (format: string) => {
    setLoading(true);
    try {
      // TODO: API call to export confirmations
      console.log(`Exporting confirmations as ${format}`);
      setError(null);
    } catch (err) {
      setError("Failed to export confirmations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveItem(tab);
  };

  // Handlers for withdrawal actions
  const handleApproveWithdrawal = async (withdrawalId: string) => {
    setLoading(true);
    try {
      // TODO: API call to approve withdrawal and initiate bank transfer
      console.log(`Approving withdrawal ${withdrawalId}`);
      // In real implementation, this would trigger bank transfer API
      setError(null);
    } catch (err) {
      setError("Failed to approve withdrawal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    setLoading(true);
    try {
      // TODO: API call to reject withdrawal
      console.log(`Rejecting withdrawal ${withdrawalId}`);
      setError(null);
    } catch (err) {
      setError("Failed to reject withdrawal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportWithdrawals = async (format: string) => {
    setLoading(true);
    try {
      // TODO: API call to export withdrawals
      console.log(`Exporting withdrawals as ${format}`);
      setError(null);
    } catch (err) {
      setError("Failed to export withdrawals. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handlers for access control actions
  const handleCreateUser = async (userData: any) => {
    setLoading(true);
    try {
      // TODO: API call to create user
      console.log(`Creating user:`, userData);
      setError(null);
    } catch (err) {
      setError("Failed to create user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, userData: any) => {
    setLoading(true);
    try {
      // TODO: API call to update user
      console.log(`Updating user ${userId}:`, userData);
      setError(null);
    } catch (err) {
      setError("Failed to update user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    try {
      // TODO: API call to delete user
      console.log(`Deleting user ${userId}`);
      setError(null);
    } catch (err) {
      setError("Failed to delete user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handlers for images management actions
  const handleUploadImages = async (files: File[], category: string) => {
    setLoading(true);
    try {
      // TODO: API call to upload images
      console.log(`Uploading ${files.length} images to ${category} category`);
      setError(null);
    } catch (err) {
      setError("Failed to upload images. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    setLoading(true);
    try {
      // TODO: API call to delete image
      console.log(`Deleting image ${imageId}`);
      setError(null);
    } catch (err) {
      setError("Failed to delete image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handlers for users management actions
  const handleResetRewardPoints = async (userId: string) => {
    setLoading(true);
    try {
      // TODO: API call to reset user reward points
      console.log(`Resetting reward points for user ${userId}`);
      setError(null);
    } catch (err) {
      setError("Failed to reset reward points. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationAdminPassword = async (userId: string) => {
    setLoading(true);
    try {
      // TODO: API call for admin password confirmation before user suspension
      console.log(`Admin password confirmation for user ${userId}`);
      setError(null);
    } catch (err) {
      setError("Failed to confirm admin password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsers = async (format: 'csv' | 'pdf' | 'excel') => {
    setLoading(true);
    try {
      // TODO: API call to export users data
      console.log(`Exporting users as ${format.toUpperCase()}`);
      setError(null);
    } catch (err) {
      setError("Failed to export users data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  console.log("Dashboard component rendered for user:", user);

  const getPageContent = () => {
    switch (activeItem) {
      case "dashboard":
        if (!isAllowed("dashboard")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <div className="space-y-8">
            {/* Top Section - Metrics Cards (3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order Shipped Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">ORDER SHIPPED</p>
                    <p className="text-sm text-gray-500 mb-2">NUMBER OF DELIVERED TRANSACTIONS</p>
                    <p className="text-2xl font-bold text-gray-900">(average order)</p>
                  </div>
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
              </div>

              {/* Total Transactions Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">TOTAL NUMBER OF</p>
                    <p className="text-sm text-gray-500 mb-2">DELIVERED TRANSACTIONS</p>
                    <p className="text-2xl font-bold text-gray-900">(total transactions)</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Active Users Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">ACTIVE USERS</p>
                    <p className="text-sm text-gray-500 mb-2">(active users count per day)</p>
                    <p className="text-2xl font-bold text-gray-900">24,567</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontal Filters Bar */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-4 gap-4">
                {/* Date Filter */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">DATE RANGE</label>
                  <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option>Select date range</option>
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 3 months</option>
                    <option>Last year</option>
                  </select>
                </div>
                {/* Payment Method */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">PAYMENT METHOD</label>
                  <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option>All payment methods</option>
                    <option>Credit Card</option>
                    <option>Cash</option>
                    <option>Insurance</option>
                  </select>
                </div>
                {/* Payment Type */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">PAYMENT TYPE</label>
                  <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option>All payment types</option>
                    <option>Full Payment</option>
                    <option>Partial Payment</option>
                    <option>Installment</option>
                  </select>
                </div>
                {/* Location */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">LOCATION</label>
                  <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option>All locations</option>
                    <option>Main Clinic</option>
                    <option>Branch 1</option>
                    <option>Branch 2</option>
                  </select>
                </div>
                {/* Seller */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">DENTIST</label>
                  <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option>All dentists</option>
                    <option>Dr. Smith</option>
                    <option>Dr. Johnson</option>
                    <option>Dr. Williams</option>
                  </select>
                </div>
                {/* Apply / Reset */}
                <div className="flex items-end gap-2 pt-2">
                  <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg shadow-sm transition">Apply</button>
                  <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition">Reset</button>
                </div>
              </div>
            </div>

            {/* Revenue Chart Section */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">REVENUE</h3>
                  <p className="text-3xl font-bold text-gray-900">PHP 3,000,000.00</p>
                </div>
              </div>
              <RevenueChart />
            </div>
          </div>
        );
      case "booking":
        if (!isAllowed("booking")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return <Booking />;
      case "confirmation":
        if (!isAllowed("confirmation")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <ConfirmationTab 
            orders={confirmationOrders}
            loading={loading}
            error={error}
            setError={setError}
            onConfirmOrder={handleConfirmOrder}
            onRejectOrder={handleRejectOrder}
            onExportConfirmations={handleExportConfirmations}
            onTabChange={handleTabChange}
          />
        );
      case "withdrawal":
        if (!isAllowed("withdrawal")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <WithdrawalTab 
            loading={loading}
            error={error}
            setError={setError}
            onApproveWithdrawal={handleApproveWithdrawal}
            onRejectWithdrawal={handleRejectWithdrawal}
            onExportWithdrawals={handleExportWithdrawals}
            onTabChange={handleTabChange}
          />
        );
      case "access":
        if (!isAllowed("access")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <AccessTab 
            loading={loading}
            error={error}
            setError={setError}
            onTabChange={handleTabChange}
          />
        );
      case "images":
        if (!isAllowed("images")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <ImagesTab 
            loading={loading}
            error={error}
            setError={setError}
            onTabChange={handleTabChange}
          />
        );
      case "users":
        if (!isAllowed("users")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <UsersTab 
            onResetRewardPoints={handleResetRewardPoints}
            onConfirmationAdminPassword={handleConfirmationAdminPassword}
            onExport={handleExportUsers}
          />
        );
      default:
        return null;
    }
  };

  const getPageTitle = () => {
    switch (activeItem) {
      case "dashboard":
        return "Dashboard";
      case "booking":
        return "Booking";
      case "confirmation":
        return "Confirmation";
      case "withdrawal":
        return "Withdrawal";
      case "access":
        return "Access";
      case "images":
        return "Images";
      case "users":
        return "Users";
      default:
        return "Dashboard";
    }
  };

  const getPageSubtitle = () => {
    switch (activeItem) {
      case "dashboard":
        return `Welcome back, ${user.name || user.email}`;
      case "booking":
        return "Manage dental appointments and bookings";
      case "confirmation":
        return "Review and confirm patient appointments";
      case "withdrawal":
        return "Manage payment withdrawals and financial transactions";
      case "access":
        return "Control user access and system permissions";
      case "images":
        return "Manage dental images, x-rays, and patient photos";
      case "users":
        return "Manage patients, staff, and user accounts";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        activeItem={activeItem}
        onItemClick={setActiveItem}
        onLogout={onLogout}
      />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader
          title={getPageTitle()}
          subtitle={getPageSubtitle()}
        />
        
        <main className="flex-1 p-6 animate-fade-in">
          {getPageContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;