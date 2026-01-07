import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
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
import { DollarSign, Users, ShoppingCart, TrendingUp, CheckCircle } from "lucide-react";

interface DashboardProps {
  user: { name?: string; email: string };
  onLogout: () => void;
  adminMode?: boolean; // True when in admin-only section
}

const Dashboard = ({ user, onLogout, adminMode = false }: DashboardProps) => {
  // Get auth info from our hook
  const { profile, loading: authLoading, isAdmin } = useAuth();
  
  // Local state
  const [activeItem, setActiveItem] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mock data for demonstration
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

  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Function to check if user has permission for a specific feature
  const hasPermission = (permission: string): boolean => {
    if (isAdmin) return true;
    
    // Basic permissions for non-admin users
    const defaultPermissions: Record<string, boolean> = {
      dashboard: true,
      //booking: true,
      confirmation: isAdmin,
      withdrawal: isAdmin,
      access: isAdmin,
      images: true,
      users: isAdmin
    };
    
    return defaultPermissions[permission] || false;
  };

  // Action handlers
  const handleConfirmOrder = async (orderId: string) => {
    setLoading(true);
    try {
      // API call simulation
      console.log(`Confirming order ${orderId}`);
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
      // API call simulation
      console.log(`Rejecting order ${orderId}`);
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

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    console.log(`Approving withdrawal ${withdrawalId}`);
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    console.log(`Rejecting withdrawal ${withdrawalId}`);
  };

  const handleExportWithdrawals = async (format: string) => {
    console.log(`Exporting withdrawals as ${format}`);
  };

  const handleCreateUser = async (userData: any) => {
    console.log(`Creating user:`, userData);
  };

  const handleUpdateUser = async (userId: string, userData: any) => {
    console.log(`Updating user ${userId}:`, userData);
  };

  const handleDeleteUser = async (userId: string) => {
    console.log(`Deleting user ${userId}`);
  };

  const handleUploadImages = async (files: File[], category: string) => {
    console.log(`Uploading ${files.length} images to ${category} category`);
  };
  
  const handleDeleteImage = async (imageId: string) => {
    console.log(`Deleting image ${imageId}`);
  };

  const handleExportImages = async (format: string) => {
    console.log(`Exporting images as ${format}`);
  };
  
  // Additional handlers
  const handleResetRewardPoints = async (userId: string) => {
    console.log(`Resetting reward points for user ${userId}`);
  };
  
  const handleConfirmationAdminPassword = async (password: string) => {
    console.log(`Admin password confirmed for sensitive operation`);
    return true;
  };
  
  const handleExportUsers = async (format: string) => {
    console.log(`Exporting users as ${format}`);
  };

  // Content rendering based on active item
  const getPageContent = () => {
    switch (activeItem) {
      case "dashboard":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Today's Appointments"
              value="12"
              description="+2.5% from yesterday"
              icon={<Users className="w-5 h-5" />}
              trend="up"
            />
            <StatsCard
              title="New Patients"
              value="4"
              description="+1 from yesterday"
              icon={<Users className="w-5 h-5" />}
              trend="up"
            />
            <StatsCard
              title="Total Revenue"
              value="₱24,500"
              description="+15.2% from last week"
              icon={<DollarSign className="w-5 h-5" />}
              trend="up"
            />
            <StatsCard
              title="Completed Treatments"
              value="8"
              description="-1 from yesterday"
              icon={<CheckCircle className="w-5 h-5" />}
              trend="down"
            />
            
            <div className="md:col-span-2 lg:col-span-3">
              <RevenueChart />
            </div>
            
            <div className="md:col-span-2 lg:col-span-1">
              <RecentOrders />
            </div>
          </div>
        );
      case "booking":
        return (
          <Booking />
        );
      case "confirmation":
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
        return (
          <AccessTab 
            loading={loading}
            error={error}
            setError={setError}
            onTabChange={handleTabChange}
          />
        );
      case "images":
        return (
          <ImagesTab 
            loading={loading}
            error={error}
            setError={setError}
            onTabChange={handleTabChange}
          />
        );
      case "users":
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
      case "dashboard": return "Dashboard";
     // case "booking": return "Booking";
      case "confirmation": return "Confirmation";
      case "withdrawal": return "Withdrawal";
      case "access": return "Access";
      case "images": return "Images";
      case "users": return "Users";
      default: return "Dashboard";
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
