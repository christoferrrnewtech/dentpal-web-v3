import { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Settings, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  Trash2, 
  Shield, 
  Key, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Lock,
  Unlock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  role: 'admin' | 'seller';
  status: 'active' | 'inactive' | 'pending';
  permissions: {
    dashboard: boolean;
    bookings: boolean;
    confirmation: boolean;
    withdrawal: boolean;
    access: boolean;
    images: boolean;
    users: boolean;
  };
  lastLogin?: string;
  createdAt: string;
}

interface AccessTabProps {
  loading?: boolean;
  error?: string | null;
  setError?: (error: string | null) => void;
  onTabChange?: (tab: string) => void;
}

const AccessTab = ({ loading = false, error, setError, onTabChange }: AccessTabProps) => {
  const [activeSection, setActiveSection] = useState<'add' | 'admin' | 'seller'>('add');
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      username: "admin001",
      email: "admin@dentpal.com",
      role: "admin",
      status: "active",
      permissions: {
        dashboard: true,
        bookings: true,
        confirmation: true,
        withdrawal: true,
        access: true,
        images: true,
        users: true
      },
      lastLogin: "2024-09-09T10:30:00Z",
      createdAt: "2024-01-15T00:00:00Z"
    },
    {
      id: "2",
      username: "seller001",
      email: "seller1@dentpal.com",
      role: "seller",
      status: "active",
      permissions: {
        dashboard: true,
        bookings: true,
        confirmation: false,
        withdrawal: false,
        access: false,
        images: true,
        users: false
      },
      lastLogin: "2024-09-09T09:15:00Z",
      createdAt: "2024-02-20T00:00:00Z"
    },
    {
      id: "3",
      username: "seller002",
      email: "seller2@dentpal.com",
      role: "seller",
      status: "pending",
      permissions: {
        dashboard: true,
        bookings: true,
        confirmation: false,
        withdrawal: false,
        access: false,
        images: false,
        users: false
      },
      createdAt: "2024-09-08T00:00:00Z"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  // Form states
  const [newUser, setNewUser] = useState<Partial<User>>({
    username: "",
    email: "",
    password: "",
    role: "seller",
    status: "pending",
    permissions: {
      dashboard: true,
      bookings: true,
      confirmation: false,
      withdrawal: false,
      access: false,
      images: false,
      users: false
    }
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const adminUsers = filteredUsers.filter(user => user.role === 'admin');
  const sellerUsers = filteredUsers.filter(user => user.role === 'seller');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'inactive': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleAddUser = () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      setError?.("Please fill in all required fields");
      return;
    }

    const user: User = {
      id: Date.now().toString(),
      username: newUser.username,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role as 'admin' | 'seller',
      status: 'pending',
      permissions: newUser.permissions || {
        dashboard: true,
        bookings: true,
        confirmation: false,
        withdrawal: false,
        access: false,
        images: false,
        users: false
      },
      createdAt: new Date().toISOString()
    };

    setUsers(prev => [...prev, user]);
    setNewUser({
      username: "",
      email: "",
      password: "",
      role: "seller",
      status: "pending",
      permissions: {
        dashboard: true,
        bookings: true,
        confirmation: false,
        withdrawal: false,
        access: false,
        images: false,
        users: false
      }
    });
    setShowAddForm(false);
    setError?.(null);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowAddForm(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;

    setUsers(prev => prev.map(user => 
      user.id === editingUser.id ? editingUser : user
    ));
    setEditingUser(null);
    setShowAddForm(false);
    setError?.(null);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      setUsers(prev => prev.filter(user => user.id !== userId));
    }
  };

  const handleStatusChange = (userId: string, newStatus: 'active' | 'inactive' | 'pending') => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));
  };

  const handlePermissionChange = (userId: string, permission: keyof User['permissions'], value: boolean) => {
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, permissions: { ...user.permissions, [permission]: value } }
        : user
    ));
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Exporting user data...");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderUserForm = () => {
    const currentUser = editingUser || newUser;
    const isEditing = !!editingUser;

    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit User' : 'Add New User'}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowAddForm(false);
              setEditingUser(null);
            }}
          >
            ✕
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <Input
                type="text"
                placeholder="Enter username"
                value={currentUser.username || ""}
                onChange={(e) => isEditing 
                  ? setEditingUser(prev => prev ? { ...prev, username: e.target.value } : null)
                  : setNewUser(prev => ({ ...prev, username: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={currentUser.email || ""}
                onChange={(e) => isEditing 
                  ? setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)
                  : setNewUser(prev => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={currentUser.password || ""}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={currentUser.role || "seller"}
                onChange={(e) => {
                  const role = e.target.value as 'admin' | 'seller';
                  const permissions = role === 'admin' 
                    ? {
                        dashboard: true,
                        bookings: true,
                        confirmation: true,
                        withdrawal: true,
                        access: true,
                        images: true,
                        users: true
                      }
                    : {
                        dashboard: true,
                        bookings: true,
                        confirmation: false,
                        withdrawal: false,
                        access: false,
                        images: false,
                        users: false
                      };
                  
                  if (isEditing) {
                    setEditingUser(prev => prev ? { ...prev, role, permissions } : null);
                  } else {
                    setNewUser(prev => ({ ...prev, role, permissions }));
                  }
                }}
              >
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Manage Access</h4>
            <div className="space-y-3">
              {Object.entries(currentUser.permissions || {}).map(([permission, enabled]) => (
                <div key={permission} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 capitalize">
                    {permission}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => {
                        if (isEditing) {
                          setEditingUser(prev => prev ? {
                            ...prev,
                            permissions: {
                              ...prev.permissions,
                              [permission]: e.target.checked
                            }
                          } : null);
                        } else {
                          setNewUser(prev => ({
                            ...prev,
                            permissions: {
                              ...prev.permissions,
                              [permission]: e.target.checked
                            }
                          }));
                        }
                      }}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    {enabled ? (
                      <Unlock className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {isEditing ? 'Update user information and permissions' : 'All fields marked with * are required'}
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditing ? handleUpdateUser : handleAddUser}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "Processing..." : isEditing ? "Update User" : "Add User"}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderUserList = (userList: User[], title: string) => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <Badge variant="secondary" className="bg-green-50 text-green-700">
            {userList.length} users
          </Badge>
        </div>
      </div>

      <div className="overflow-hidden">
        {userList.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No {title.toLowerCase()} found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userList.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-400 to-teal-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(user.permissions).map(([permission, enabled]) => 
                          enabled ? (
                            <Badge 
                              key={permission} 
                              variant="secondary" 
                              className="text-xs bg-green-100 text-green-800"
                            >
                              {permission}
                            </Badge>
                          ) : null
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getStatusColor(user.status)} text-xs border`}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(user.status)}
                            <span>{user.status}</span>
                          </span>
                        </Badge>
                        <select
                          className="text-xs border-0 bg-transparent focus:ring-0"
                          value={user.status}
                          onChange={(e) => handleStatusChange(user.id, e.target.value as any)}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePasswordVisibility(user.id)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          {showPasswords[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Access Control</h1>
            <p className="text-green-100">Manage user access and system permissions</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 rounded-xl p-4">
              <Shield className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <XCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError?.(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-sm">
        <div className="flex space-x-2">
          <Button
            variant={activeSection === 'add' ? 'default' : 'ghost'}
            className={`flex-1 ${activeSection === 'add' 
              ? 'bg-green-600 text-white shadow-md' 
              : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveSection('add')}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
          <Button
            variant={activeSection === 'admin' ? 'default' : 'ghost'}
            className={`flex-1 ${activeSection === 'admin' 
              ? 'bg-green-600 text-white shadow-md' 
              : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveSection('admin')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Admin Users ({adminUsers.length})
          </Button>
          <Button
            variant={activeSection === 'seller' ? 'default' : 'ghost'}
            className={`flex-1 ${activeSection === 'seller' 
              ? 'bg-green-600 text-white shadow-md' 
              : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveSection('seller')}
          >
            <Users className="w-4 h-4 mr-2" />
            Seller Users ({sellerUsers.length})
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      {activeSection !== 'add' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search users by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <Button
                variant="outline"
                onClick={handleExport}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      {activeSection === 'add' && (showAddForm || editingUser) && renderUserForm()}
      
      {activeSection === 'add' && !showAddForm && !editingUser && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="max-w-md mx-auto">
            <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Add New User</h3>
            <p className="text-gray-500 mb-8">
              Create new user accounts and manage their access permissions to different parts of the system.
            </p>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Create New User
            </Button>
          </div>
        </div>
      )}

      {activeSection === 'admin' && renderUserList(adminUsers, 'Admin Users')}
      {activeSection === 'seller' && renderUserList(sellerUsers, 'Seller Users')}
    </div>
  );
};

export default AccessTab;
