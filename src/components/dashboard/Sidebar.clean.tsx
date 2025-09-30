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
  X
} from "lucide-react";
import dentalLogo from "@/assets/dentpal_logo.png";
import { useAuth } from "@/hooks/useAuth";
import type { WebUserPermissions } from "@/types/webUser";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
  onLogout: () => void;
}

const menuItems: Array<{
  id: string;
  label: string;
  icon: any;
  permission: keyof WebUserPermissions;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { id: "booking", label: "Booking", icon: Calendar, permission: "bookings" },
  { id: "confirmation", label: "Confirmation", icon: CheckCircle, permission: "confirmation" },
  { id: "withdrawal", label: "Withdrawal", icon: CreditCard, permission: "withdrawal" },
  { id: "access", label: "Access", icon: Key, permission: "access" },
  { id: "images", label: "Images", icon: Images, permission: "images" },
  { id: "users", label: "Users", icon: Users, permission: "users" },
];

const Sidebar = ({ activeItem, onItemClick, onLogout }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { hasPermission, profile, loading } = useAuth();

  // Show loading state if auth is still loading
  if (loading) {
    return (
      <div className={`bg-card border-r border-border flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}>
        <div className="p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
        </div>
      </div>
    );
  }

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
                <p className="text-xs text-muted-foreground">Admin Panel</p>
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
          {menuItems
            // Filter menu items based on user permissions
            .filter(item => hasPermission(item.permission))
            .map((item) => {
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
