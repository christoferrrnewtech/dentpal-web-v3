import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CheckCircle, 
  CreditCard,
  Key,
  Images,
  LogOut,
  Menu,
  X,
  IdCard,
  BarChart3
} from "lucide-react";
import dentalLogo from "@/assets/dentpal_logo.png";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
  onLogout: () => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: IdCard },
  { id: "reports", label: "Reports", icon: BarChart3 }, // New: Reports tab
  { id: "booking", label: "Booking", icon: Calendar },
  { id: 'seller-orders', label: 'Seller Orders', icon: Calendar },
  { id: "inventory", label: "Inventory", icon: LayoutDashboard },
  { id: "confirmation", label: "Confirmation", icon: CheckCircle },
  { id: "withdrawal", label: "Withdrawal", icon: CreditCard },
  { id: "access", label: "Access", icon: Key },
  { id: "images", label: "Images", icon: Images },
  { id: "users", label: "Users", icon: Users },
];

const Sidebar = ({ activeItem, onItemClick, onLogout }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { hasPermission, loading, isAdmin, isSeller, role } = useAuth();

  const panelLabel = isAdmin
    ? 'Admin Panel'
    : isSeller
    ? 'Seller Panel'
    : role
    ? `${role.charAt(0).toUpperCase()}${role.slice(1)} Panel`
    : 'Panel';

  const permissionByMenuId: Record<string, string> = {
    dashboard: "dashboard",
    profile: "dashboard",
    reports: "dashboard", // New: allow reports for sellers by default
    booking: "bookings",
    'seller-orders': 'seller-orders',
    inventory: 'inventory',
    confirmation: "confirmation",
    withdrawal: "withdrawal",
    access: "access",
    images: "images",
    users: "users",
  };

  const visibleMenuItems = loading
    ? []
    : menuItems.filter((item) => {
        const key = permissionByMenuId[item.id] || 'dashboard';
        return hasPermission(key as any);
      });

  return (
    <div className={`bg-card border-r border-border flex flex-col transition-all duration-300 ${
      isCollapsed ? "w-16" : "w-64"
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src={dentalLogo} 
                  alt="DentPal Logo" 
                  className="w-8 h-8 object-contain rounded-lg"
                  onError={(e) => {
                    // Fallback to SVG icon if image fails to load
                    e.currentTarget.style.display = 'none';
                    const fallbackElement = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallbackElement) {
                      fallbackElement.style.display = 'flex';
                    }
                  }}
                />
                <div className="w-8 h-8 bg-gradient-primary rounded-lg items-center justify-center hidden">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10 9 10s9-4.45 9-10V7l-10-5z"/>
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">DentPal</h2>
                <p className="text-xs text-muted-foreground">{panelLabel}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4">
        <nav className="space-y-2">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onItemClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={onLogout}
          className={`w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 ${
            isCollapsed ? "px-0" : ""
          }`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;