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
  BarChart3,
  PlusSquare,
  Bell,
  ShieldCheck
} from "lucide-react";
import dentalLogo from "@/assets/dentpal_logo.png";
import { useAuth } from "@/hooks/use-auth";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
  onLogout: () => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: IdCard },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "booking", label: "Booking", icon: Calendar },
  { id: 'seller-orders', label: 'Seller Orders', icon: Calendar },
  { id: "inventory", label: "Inventory", icon: LayoutDashboard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "add-product", label: "Add Product", icon: PlusSquare },
  { id: "product-qc", label: "QC Product", icon: CheckCircle },
  { id: "warranty", label: "Warranty", icon: ShieldCheck },
  { id: "confirmation", label: "Confirmation", icon: CheckCircle },
  { id: "withdrawal", label: "Withdrawal", icon: CreditCard },
  { id: "sub-accounts", label: "Sub Account", icon: Users },
  { id: "access", label: "Access", icon: Key },
  { id: "images", label: "Images", icon: Images },
  { id: "users", label: "Users", icon: Users },
];

const Sidebar = ({ activeItem, onItemClick, onLogout }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { hasPermission, loading, isAdmin, isSeller, isSubAccount, role } = useAuth();
  const { vendorProfileComplete } = useProfileCompletion();

  const panelLabel = isAdmin
    ? 'Admin Panel'
    : isSeller
    ? 'Seller Panel'
    : role
    ? `${role.charAt(0).toUpperCase()}${role.slice(1)} Panel`
    : 'Panel';

  const permissionByMenuId: Record<string, string> = {
    dashboard: "dashboard",
    profile: "profile",
    reports: "reports",
    booking: "bookings",
    'seller-orders': 'seller-orders',
    inventory: 'inventory',
    'add-product': 'add-product',
    'product-qc': 'product-qc',
    warranty: 'warranty',
    confirmation: "confirmation",
    withdrawal: "withdrawal",
    'sub-accounts': 'dashboard',
    access: "access",
    images: "images",
    users: "users",
    notifications: 'notifications',
  };

  // Compute visible menu items with role-based ordering for sellers
  const visibleMenuItems = loading
    ? []
    : (() => {
        // Start from permitted list
        let permitted = menuItems.filter((item) => {
          if (item.id === 'product-qc' && !isAdmin) return false;
          if (item.id === 'warranty' && !isAdmin) return false;
          const key = permissionByMenuId[item.id];

          // For sub-accounts: only show items that have an explicit permission flag and it's true
          if (isSubAccount) {
            if (!key) return false; // no explicit key => do not show
            return hasPermission(key as any);
          }

          // Primary/admin: default to dashboard when specific key not mapped
          return hasPermission((key || 'dashboard') as any);
        });

        // Sub-accounts: never show Access or Sub Account regardless of permissions
        if (isSubAccount) {
          permitted = permitted.filter((i) => i.id !== 'access' && i.id !== 'sub-accounts');
          // No vendor gating for sub-accounts
          return permitted;
        }

        // If seller (primary) and vendor profile not complete, only show Profile
        if (isSeller && !isAdmin && !vendorProfileComplete) {
          return permitted.filter((i) => i.id === 'profile');
        }

        // Primary sellers (not sub-accounts): custom seller ordering
        if (isSeller && !isAdmin) {
          const sellerOrder = ['dashboard', 'seller-orders', 'reports', 'inventory', 'add-product', 'sub-accounts', 'profile'];
          const map = new Map(permitted.map((i) => [i.id, i] as const));
          return sellerOrder.map((id) => map.get(id)).filter(Boolean) as typeof permitted;
        }

        // Admins keep full permitted list and original order
        return permitted;
      })();

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
            // Seller-specific label adjustments
            const displayLabel = (isSeller && !isAdmin)
              ? (item.id === 'seller-orders' ? 'Orders' : item.id === 'reports' ? 'Report' : item.label)
              : item.label;
            
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
                {!isCollapsed && <span className="font-medium">{displayLabel}</span>}
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