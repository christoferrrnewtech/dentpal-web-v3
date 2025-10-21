import Auth from "./Auth";
import Dashboard from "./Dashboard";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, profile, loading, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      console.log("✅ User logged out successfully");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span className="text-lg font-medium text-gray-700">Loading DentPal...</span>
          </div>
        </div>
      </div>
    );
  }

  console.log("🔍 Index component rendered:", { 
    isAuthenticated, 
    userEmail: user?.email, 
    profileRole: profile?.role 
  });

  if (!isAuthenticated) {
    return <Auth />;
  }

  const dashboardUser = {
    name: profile?.name || user?.displayName || 'User',
    email: user?.email || profile?.email || 'unknown@example.com'
  };

  return <Dashboard user={dashboardUser} onLogout={handleLogout} />;
};

export default Index;
