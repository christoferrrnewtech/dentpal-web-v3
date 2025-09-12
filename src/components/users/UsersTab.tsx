import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/seperator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  FileText,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users as UsersIcon,
  TrendingUp,
  CreditCard,
  ShoppingBag
} from "lucide-react";

// User interface matching the Figma design
interface User {
  id: string;
  accountId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  contactNumber: string;
  shippingAddresses: string[];
  specialty: string;
  totalTransactions: number;
  totalSpent: number;
  registrationDate: string;
  lastActivity: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  rewardPoints: number;
  membershipLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  profileComplete: boolean;
}

// Mock user data based on Figma specifications
const mockUsers: User[] = [
  {
    id: '1',
    accountId: 'ACC-001234',
    firstName: 'Dr. Maria',
    middleName: 'Santos',
    lastName: 'Rodriguez',
    email: 'maria.rodriguez@dentalclinic.ph',
    contactNumber: '+63 917 123 4567',
    shippingAddresses: [
      '123 Rizal Street, Makati City, Metro Manila 1200',
      '456 Dental Plaza, BGC, Taguig City 1634'
    ],
    specialty: 'General Dentistry',
    totalTransactions: 145,
    totalSpent: 2850000,
    registrationDate: '2023-01-15',
    lastActivity: '2024-09-09',
    status: 'active',
    rewardPoints: 2850,
    membershipLevel: 'gold',
    profileComplete: true
  },
  {
    id: '2',
    accountId: 'ACC-002345',
    firstName: 'Dr. Juan',
    lastName: 'dela Cruz',
    email: 'juan.delacruz@orthodontics.ph',
    contactNumber: '+63 918 234 5678',
    shippingAddresses: [
      '789 Ortigas Avenue, Pasig City, Metro Manila 1600'
    ],
    specialty: 'Orthodontics',
    totalTransactions: 89,
    totalSpent: 1750000,
    registrationDate: '2023-03-22',
    lastActivity: '2024-09-08',
    status: 'active',
    rewardPoints: 1750,
    membershipLevel: 'silver',
    profileComplete: true
  },
  {
    id: '3',
    accountId: 'ACC-003456',
    firstName: 'Dr. Ana',
    middleName: 'Marie',
    lastName: 'Gonzales',
    email: 'ana.gonzales@pediatricdental.ph',
    contactNumber: '+63 919 345 6789',
    shippingAddresses: [
      '321 Commonwealth Avenue, Quezon City, Metro Manila 1121'
    ],
    specialty: 'Pediatric Dentistry',
    totalTransactions: 203,
    totalSpent: 4125000,
    registrationDate: '2022-08-10',
    lastActivity: '2024-09-10',
    status: 'active',
    rewardPoints: 4125,
    membershipLevel: 'platinum',
    profileComplete: true
  },
  {
    id: '4',
    accountId: 'ACC-004567',
    firstName: 'Dr. Roberto',
    lastName: 'Villanueva',
    email: 'roberto.villanueva@surgery.ph',
    contactNumber: '+63 920 456 7890',
    shippingAddresses: [
      '654 EDSA, Mandaluyong City, Metro Manila 1550'
    ],
    specialty: 'Oral Surgery',
    totalTransactions: 67,
    totalSpent: 980000,
    registrationDate: '2023-06-18',
    lastActivity: '2024-09-07',
    status: 'inactive',
    rewardPoints: 980,
    membershipLevel: 'bronze',
    profileComplete: false
  },
  {
    id: '5',
    accountId: 'ACC-005678',
    firstName: 'Dr. Carmen',
    lastName: 'Reyes',
    email: 'carmen.reyes@endodontics.ph',
    contactNumber: '+63 921 567 8901',
    shippingAddresses: [
      '987 Alabang-Zapote Road, Las Piñas City, Metro Manila 1740'
    ],
    specialty: 'Endodontics',
    totalTransactions: 128,
    totalSpent: 2300000,
    registrationDate: '2023-02-28',
    lastActivity: '2024-09-06',
    status: 'pending',
    rewardPoints: 2300,
    membershipLevel: 'gold',
    profileComplete: true
  }
];

interface UsersTabProps {
  onResetRewardPoints?: (userId: string) => void;
  onConfirmationAdminPassword?: (userId: string) => void;
  onExport?: (format: 'csv' | 'pdf' | 'excel') => void;
}

const UsersTab: React.FC<UsersTabProps> = ({
  onResetRewardPoints,
  onConfirmationAdminPassword,
  onExport
}) => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.accountId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.firstName} ${user.middleName || ''} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.contactNumber.includes(searchQuery) ||
        user.specialty.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLocation = selectedLocation === 'all' || 
        user.shippingAddresses.some(address => 
          address.toLowerCase().includes(selectedLocation.toLowerCase())
        );

      const matchesSpecialty = selectedSpecialty === 'all' || 
        user.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase());

      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;

      return matchesSearch && matchesLocation && matchesSpecialty && matchesStatus;
    });
  }, [users, searchQuery, selectedLocation, selectedSpecialty, selectedStatus]);

  // Get unique locations, specialties for filter options
  const locations = Array.from(new Set(
    users.flatMap(user => 
      user.shippingAddresses.map(address => {
        const cityMatch = address.match(/,\s*([^,]+),\s*Metro Manila/);
        return cityMatch ? cityMatch[1] : 'Other';
      })
    )
  ));

  const specialties = Array.from(new Set(users.map(user => user.specialty)));

  // Handle user selection
  const handleUserSelect = (userId: string, checked: boolean) => {
    setSelectedUsers(prev => 
      checked 
        ? [...prev, userId]
        : prev.filter(id => id !== userId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedUsers(checked ? filteredUsers.map(user => user.id) : []);
  };

  // Get status badge variant
  const getStatusBadge = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Active
        </Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-200">
          <Clock className="w-3 h-3 mr-1" />
          Inactive
        </Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Pending
        </Badge>;
      case 'suspended':
        return <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          Suspended
        </Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // Get membership badge
  const getMembershipBadge = (level: User['membershipLevel']) => {
    const colors = {
      bronze: 'bg-amber-100 text-amber-800',
      silver: 'bg-gray-100 text-gray-800', 
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <Badge variant="outline" className={colors[level]}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    );
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle view user details
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  // Handle reset reward points
  const handleResetReward = (userId: string) => {
    setResetUserId(userId);
    setIsResetDialogOpen(true);
  };

  const confirmResetReward = () => {
    if (resetUserId && onResetRewardPoints) {
      onResetRewardPoints(resetUserId);
      setUsers(prev => prev.map(user => 
        user.id === resetUserId ? { ...user, rewardPoints: 0 } : user
      ));
    }
    setIsResetDialogOpen(false);
    setResetUserId(null);
  };

  // Handle export
  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    if (onExport) {
      onExport(format);
    }
    // Here you would implement actual export functionality
    console.log(`Exporting ${filteredUsers.length} users as ${format.toUpperCase()}`);
  };

  // Calculate summary statistics
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const totalRevenue = users.reduce((sum, user) => sum + user.totalSpent, 0);
  const totalTransactions = users.reduce((sum, user) => sum + user.totalTransactions, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Users Management</h2>
          <p className="text-muted-foreground">Manage dental professionals and their account information</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <UsersIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-foreground">{activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <ShoppingBag className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-foreground">{totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search by Account ID */}
            <div className="space-y-2">
              <Label htmlFor="accountId">Account ID</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="accountId"
                  placeholder="Search accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <Label htmlFor="location">Select Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specialty Filter */}
            <div className="space-y-2">
              <Label htmlFor="specialty">Select Specialty</Label>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {specialties.map(specialty => (
                    <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleResetReward('bulk')}
                disabled={selectedUsers.length === 0}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Unban User
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Reset reward points for selected users
                  if (selectedUsers.length > 0) {
                    setResetUserId('bulk');
                    setIsResetDialogOpen(true);
                  }
                }}
                disabled={selectedUsers.length === 0}
              >
                Reset Reward Points
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            {selectedUsers.length > 0 && (
              <Badge variant="secondary">
                {selectedUsers.length} selected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact No.</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Reward Points</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleUserSelect(user.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-primary">{user.accountId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.middleName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{user.contactNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{user.specialty}</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.status)}
                    </TableCell>
                    <TableCell>
                      {getMembershipBadge(user.membershipLevel)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatCurrency(user.totalSpent)}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.totalTransactions} orders
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {user.rewardPoints.toLocaleString()} pts
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(user.lastActivity)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewUser(user)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetReward(user.id)}>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Reset Rewards
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              if (onConfirmationAdminPassword) {
                                onConfirmationAdminPassword(user.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Suspend User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Comprehensive information about the selected user
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {selectedUser.firstName} {selectedUser.middleName} {selectedUser.lastName}
                        </h3>
                        <p className="text-muted-foreground">{selectedUser.specialty}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          {getStatusBadge(selectedUser.status)}
                          {getMembershipBadge(selectedUser.membershipLevel)}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedUser.email}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedUser.contactNumber}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Joined {formatDate(selectedUser.registrationDate)}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Last active {formatDate(selectedUser.lastActivity)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Transaction Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Transaction Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedUser.totalTransactions}
                        </div>
                        <div className="text-sm text-blue-600">Total Orders</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(selectedUser.totalSpent)}
                        </div>
                        <div className="text-sm text-green-600">Total Spent</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Account ID</span>
                        <span className="font-medium">{selectedUser.accountId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Reward Points</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {selectedUser.rewardPoints.toLocaleString()} pts
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Profile Complete</span>
                        <Badge variant={selectedUser.profileComplete ? "default" : "secondary"}>
                          {selectedUser.profileComplete ? "Complete" : "Incomplete"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Shipping Addresses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span>Shipping Addresses</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedUser.shippingAddresses.map((address, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-sm">
                              Address {index + 1}
                              {index === 0 && <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{address}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            {selectedUser && (
              <Button onClick={() => handleResetReward(selectedUser.id)}>
                Reset Reward Points
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Reward Points Confirmation Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Reward Points</DialogTitle>
            <DialogDescription>
              {resetUserId === 'bulk' 
                ? `Are you sure you want to reset reward points for ${selectedUsers.length} selected users? This action cannot be undone.`
                : 'Are you sure you want to reset the reward points for this user? This action cannot be undone.'
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmResetReward}>
              Reset Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersTab;
