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
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Lock,
  Unlock,
  FileText,
  FileSpreadsheet,
  File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
// Add dropdown UI for export actions
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
// Replace backend partner provisioning with direct web user service (Firestore + password email)
import { createWebUser, updateWebUserAccess, setWebUserStatus, getWebUsers, resendUserInvite } from '@/services/webUserService';
import type { WebUserProfile } from '@/types/webUser';
// Export libs
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// New: professional XLSX export with styling + logo
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dentpalLogo from '@/assets/dentpal_logo.png';
import { useToast } from '@/hooks/use-toast';

// Helper to normalize Firestore Timestamp/number/string to epoch millis
function normalizeTimestamp(value: any): number | null {
  try {
    if (!value) return null;
    if (typeof value === 'number') {
      // if seconds, convert to ms
      return value < 1e12 ? value * 1000 : value;
    }
    if (typeof value === 'string') {
      const ms = Date.parse(value);
      return isNaN(ms) ? null : ms;
    }
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value.toDate === 'function') {
      // Firestore Timestamp
      return value.toDate().getTime();
    }
    if (typeof value.seconds === 'number') {
      return value.seconds * 1000;
    }
  } catch {}
  return null;
}

// Default permissions fallback by role
  const defaultPermissionsByRole = (role: 'admin' | 'seller') => ({
    dashboard: true,
    bookings: true,
    confirmation: role === 'admin',
    withdrawal: role === 'admin',
    access: role === 'admin',
    images: role === 'admin',
    users: role === 'admin',
    inventory: role === 'admin',
    'seller-orders': true
  });

  // Normalize any loaded permissions to include all keys for the role
  const ensurePermissions = (role: 'admin' | 'seller', perms: Partial<User['permissions']> | undefined | null): User['permissions'] => {
    return { ...defaultPermissionsByRole(role), ...(perms || {}) } as User['permissions'];
  };

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
    inventory: boolean;
    'seller-orders': boolean;
  };
  lastLogin?: string;
  createdAt: string;
}

interface AccessTabProps {
  loading?: boolean;
  error?: string | null;
  setError?: (error: string | null) => void;
  onTabChange?: (tab: string) => void;
  onEditUser?: (user: User) => void; // optional callback when clicking Edit
}

const AccessTab = ({ loading = false, error, setError, onTabChange, onEditUser }: AccessTabProps) => {
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
        users: true,
        inventory: true,
        'seller-orders': true
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
        users: false,
        inventory: false,
        'seller-orders': true
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
        users: false,
        inventory: false,
        'seller-orders': true
      },
      createdAt: "2024-09-08T00:00:00Z"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [newUser, setNewUser] = useState<Partial<User>>({
    username: "",
    email: "",
    role: "seller",
    status: "pending",
    permissions: defaultPermissionsByRole('seller')
  });

  const { toast } = useToast();

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

  // Load users from Firestore on mount
  useEffect(() => {
    const load = async () => {
      try {
        const webUsers = await getWebUsers(); // fetch all roles
        const mapped: User[] = webUsers.map((u: WebUserProfile) => {
           const createdAtMs = normalizeTimestamp((u as any).createdAt);
           const lastLoginMs = normalizeTimestamp((u as any).lastLogin);
          const perms = ensurePermissions(u.role, (u as any).permissions);
           return {
             id: u.uid,
             username: u.name,
             email: u.email,
             role: u.role,
             status: u.isActive ? 'active' : 'inactive',
             permissions: perms,
             lastLogin: lastLoginMs ? new Date(lastLoginMs).toISOString() : undefined,
             createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : new Date().toISOString(),
           };
         });
        setUsers(mapped);
      } catch (e: any) {
        console.error('Failed to load web users:', e);
        setError?.(e.message || 'Failed to load users');
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email) {
      setError?.("Please fill in all required fields");
      return;
    }

    try {
      // Create Auth user + profile in Firestore and send password setup link via email
      const created = await createWebUser(
        newUser.email!,
        newUser.username!,
        (newUser.role as 'admin' | 'seller') || 'seller',
        (newUser.permissions as any) || {
          dashboard: true,
          bookings: true,
          confirmation: false,
          withdrawal: false,
          access: false,
          images: false,
          users: false,
          inventory: false,
          'seller-orders': true
        }
      );

      const user: User = {
        id: created.uid,
        username: newUser.username!,
        email: newUser.email!,
        role: (newUser.role as 'admin' | 'seller') || 'seller',
        status: 'pending',
        permissions: newUser.permissions || defaultPermissionsByRole((newUser.role as 'admin' | 'seller') || 'seller'),
        createdAt: new Date().toISOString()
      };

      setUsers(prev => [...prev, user]);
      // Optionally refresh from Firestore to reflect authoritative data
      try {
        const webUsers = await getWebUsers();
        const mapped: User[] = webUsers.map((u: WebUserProfile) => {
           const createdAtMs = normalizeTimestamp((u as any).createdAt);
           const lastLoginMs = normalizeTimestamp((u as any).lastLogin);
          const perms = ensurePermissions(u.role, (u as any).permissions);
           return {
             id: u.uid,
             username: u.name,
             email: u.email,
             role: u.role,
             status: u.isActive ? 'active' : 'inactive',
             permissions: perms,
             lastLogin: lastLoginMs ? new Date(lastLoginMs).toISOString() : undefined,
             createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : new Date().toISOString(),
           };
         });
        setUsers(mapped);
      } catch {}
      setNewUser({
        username: "",
        email: "",
        role: "seller",
        status: "pending",
        permissions: defaultPermissionsByRole('seller')
      });
      setShowAddForm(false);
      setError?.(null);
    } catch (e: any) {
      setError?.(e.message || 'Failed to create user');
    }
  };

  const handleEditUser = (user: User) => {
    if (onEditUser) {
      onEditUser(user);
      return;
    }
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleResendInvite = async (user: User) => {
    try {
      const confirmed = window.confirm(`Resend invitation email to ${user.email}?`);
      if (!confirmed) return;
      await resendUserInvite(user.email);
      toast({ title: 'Invite sent', description: `Password reset link sent to ${user.email}` });
    } catch (e: any) {
      setError?.(e.message || 'Failed to resend invitation email');
      toast({ title: 'Failed to send invite', description: e.message || 'Please try again.' });
    }
  };

  const handleToggleActive = async (user: User) => {
    const next = user.status === 'active' ? 'inactive' : 'active';
    const verb = next === 'active' ? 'activate' : 'deactivate';
    const confirmed = window.confirm(`Are you sure you want to ${verb} ${user.username}?`);
    if (!confirmed) return;
    await handleStatusChange(user.id, next as any);
    toast({ title: `User ${next}`, description: `${user.username} is now ${next}.` });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      // Update role and permissions in Firestore (no RBAC enforcement yet)
      await updateWebUserAccess(
        editingUser.id,
        editingUser.role,
        editingUser.permissions as any
      );

      setUsers(prev => prev.map((user) => (
        user.id === editingUser.id ? editingUser : user
      )));
      // Refresh list from Firestore to reflect authoritative data
      try {
        const webUsers = await getWebUsers();
        const mapped: User[] = webUsers.map((u: WebUserProfile) => {
           const createdAtMs = normalizeTimestamp((u as any).createdAt);
           const lastLoginMs = normalizeTimestamp((u as any).lastLogin);
          const perms = ensurePermissions(u.role, (u as any).permissions);
           return {
             id: u.uid,
             username: u.name,
             email: u.email,
             role: u.role,
             status: u.isActive ? 'active' : 'inactive',
             permissions: perms,
             lastLogin: lastLoginMs ? new Date(lastLoginMs).toISOString() : undefined,
             createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : new Date().toISOString(),
           };
         });
        setUsers(mapped);
      } catch {}
      setEditingUser(null);
      setShowAddForm(false);
      setError?.(null);
      toast({ title: 'User updated', description: 'Access and permissions saved.' });
    } catch (e: any) {
      setError?.(e.message || 'Failed to update user');
    }
  };

  // Save from dialog
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      setSaving(true);
      await handleUpdateUser();
      setIsEditDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      setUsers(prev => prev.filter(user => user.id !== userId));
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive' | 'pending') => {
    setUsers(prev => prev.map((user) => (
      user.id === userId ? { ...user, status: newStatus } : user
    )));
    try {
      // Persist active/inactive to Firestore boolean flag
      if (newStatus === 'active' || newStatus === 'inactive') {
        await setWebUserStatus(userId, newStatus === 'active');
      }
      // Refresh list to reflect persisted status
      try {
        const webUsers = await getWebUsers();
        const mapped: User[] = webUsers.map((u: WebUserProfile) => {
           const createdAtMs = normalizeTimestamp((u as any).createdAt);
           const lastLoginMs = normalizeTimestamp((u as any).lastLogin);
          const perms = ensurePermissions(u.role, (u as any).permissions);
           return {
             id: u.uid,
             username: u.name,
             email: u.email,
             role: u.role,
             status: u.isActive ? 'active' : 'inactive',
             permissions: perms,
             lastLogin: lastLoginMs ? new Date(lastLoginMs).toISOString() : undefined,
             createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : new Date().toISOString(),
           };
         });
        setUsers(mapped);
      } catch {}
    } catch (e: any) {
      setError?.(e.message || 'Failed to update status');
    }
  };

  const handlePermissionChange = (userId: string, permission: keyof User['permissions'], value: boolean) => {
    setUsers(prev => prev.map((user) => (
      user.id === userId 
        ? { ...user, permissions: { ...user.permissions, [permission]: value } }
        : user
    )));
  };

  const formatUserForExport = (u: User) => ({
    Username: u.username,
    Email: u.email,
    Role: u.role,
    Status: u.status,
    Permissions: Object.entries(u.permissions || {})
      .filter(([, v]) => !!v)
      .map(([k]) => k)
      .join(', '),
    CreatedAt: u.createdAt,
    LastLogin: u.lastLogin || ''
  });

  // Helper to convert image URL to base64 data URL (for PDF/ExcelJS)
  const loadImageDataUrl = async (url: string): Promise<string> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const exportToPDF = async (list: User[], title: string) => {
    const data = list.map(formatUserForExport);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    // Header with logo and title
    try {
      const logoDataUrl = await loadImageDataUrl(dentpalLogo);
      doc.addImage(logoDataUrl, 'PNG', 40, 24, 100, 28);
    } catch {}

    doc.setFontSize(18);
    doc.setTextColor(34, 139, 94); // DentPal brand-ish
    doc.text(`${title}`, 160, 44);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Exported: ${new Date().toLocaleString()}`, 160, 60);

    // Table
    (doc as any).autoTable({
      head: [["Username", "Email", "Role", "Status", "Permissions", "Created At", "Last Login"]],
      body: data.map(d => [d.Username, d.Email, d.Role, d.Status, d.Permissions, d.CreatedAt, d.LastLogin]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      bodyStyles: { textColor: [55, 65, 81] },
      theme: 'grid',
      startY: 90,
      didDrawPage: (data: any) => {
        // Footer with page numbers
        const ps: any = doc.internal.pageSize as any;
        const pageHeight = ps.height || (ps.getHeight && ps.getHeight());
        const pageWidth = ps.width || (ps.getWidth && ps.getWidth());
        const page = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : data.pageNumber;
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`DentPal • ${new Date().getFullYear()}`, 40, (pageHeight || 792) - 24);
        doc.text(`Page ${page}`, (pageWidth || 1120) - 80, (pageHeight || 792) - 24);
      }
    });

    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.pdf`);
  };

  const exportToCSV = (list: User[], title: string) => {
    const data = list.map(formatUserForExport);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.csv`, { bookType: 'csv' });
  };

  const exportToExcel = async (list: User[], title: string) => {
    const data = list.map(formatUserForExport);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet 1', {
      properties: { defaultRowHeight: 22 },
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    // Add logo
    try {
      const logoDataUrl = await loadImageDataUrl(dentpalLogo);
      const imageId = workbook.addImage({ base64: logoDataUrl, extension: 'png' });
      sheet.addImage(imageId, {
        tl: { col: 0, row: 0 }, // top-left at A1
        ext: { width: 140, height: 40 }
      });
    } catch {}

    // Title row
    const titleRowIndex = 3;
    sheet.mergeCells(titleRowIndex, 2, titleRowIndex, 7); // merge B3:G3
    const titleCell = sheet.getCell(titleRowIndex, 2);
    titleCell.value = `${title}`;
    titleCell.font = { name: 'Inter', bold: true, size: 18, color: { argb: 'FF065F46' } };

    // Subtitle row (exported at)
    const subRowIndex = 4;
    sheet.mergeCells(subRowIndex, 2, subRowIndex, 7);
    const subCell = sheet.getCell(subRowIndex, 2);
    subCell.value = `Exported: ${new Date().toLocaleString()}`;
    subCell.font = { size: 10, color: { argb: 'FF6B7280' } };

    // Header row
    const headerRowIndex = 6;
    const headers = ["Username", "Email", "Role", "Status", "Permissions", "Created At", "Last Login"];
    sheet.getRow(headerRowIndex).values = headers;
    sheet.getRow(headerRowIndex).font = { name: 'Inter', bold: true, color: { argb: 'FFFFFFFF' } } as any;
    sheet.getRow(headerRowIndex).alignment = { vertical: 'middle' as const, horizontal: 'center' as const };
    sheet.getRow(headerRowIndex).height = 28;

    // Header styling and column widths
    const columnWidths = [22, 30, 12, 14, 40, 22, 22];
    headers.forEach((_, i) => {
      const cell = sheet.getRow(headerRowIndex).getCell(i + 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } } as any;
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      sheet.getColumn(i + 1).width = columnWidths[i];
    });

    // Data rows
    const startRow = headerRowIndex + 1;
    data.forEach((d, idx) => {
      const rowIndex = startRow + idx;
      const row = sheet.getRow(rowIndex);
      row.values = [d.Username, d.Email, d.Role, d.Status, d.Permissions, d.CreatedAt, d.LastLogin];
      row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true } as any;
      row.height = 22;
      // Zebra striping
      const isAlt = idx % 2 === 0;
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'hair' }, left: { style: 'hair' }, bottom: { style: 'hair' }, right: { style: 'hair' }
        };
        if (isAlt) {
          (cell as any).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        }
      });
    });

    // Freeze header
    sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];

    // Footer note
    const footerRow = sheet.addRow([`DentPal • © ${new Date().getFullYear()}`]);
    footerRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF6B7280' } } as any;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.xlsx`);
  };

  const exportUsers = async (list: User[], type: 'csv' | 'xlsx' | 'pdf', title: string) => {
    if (type === 'pdf') return await exportToPDF(list, title);
    if (type === 'xlsx') return await exportToExcel(list, title);
    return exportToCSV(list, title);
  };

  const formatDate = (dateString: string) => {
    try {
      const ms = normalizeTimestamp(dateString) ?? Date.parse(dateString);
      if (!ms || isNaN(ms)) return dateString;
      return new Date(ms).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleExport = () => {
    const list = activeSection === 'admin' ? adminUsers : activeSection === 'seller' ? sellerUsers : filteredUsers;
    const title = activeSection === 'admin' ? 'Admin Users' : activeSection === 'seller' ? 'Seller Users' : 'Users';
    exportUsers(list, 'xlsx', title);
  };

  // New: handler that receives a type from dropdowns
  const handleExportAs = async (type: 'csv' | 'xlsx' | 'pdf', listOverride?: User[], titleOverride?: string) => {
    const list = listOverride || (activeSection === 'admin' ? adminUsers : activeSection === 'seller' ? sellerUsers : filteredUsers);
    const title = titleOverride || (activeSection === 'admin' ? 'Admin Users' : activeSection === 'seller' ? 'Seller Users' : 'Users');
    await exportUsers(list, type, title);
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
            {/* Remove password input: invites send a reset link instead */}
            {!isEditing && (
              <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                An invite email with a password setup link will be sent to this user.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={currentUser.role || "seller"}
                onChange={(e) => {
                  const role = e.target.value as 'admin' | 'seller';
                  const permissions = defaultPermissionsByRole(role);
                  
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
            {isEditing ? 'Update user information and permissions' : 'The user will receive an email to set their password'}
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
              {loading ? "Processing..." : isEditing ? "Update User" : "Invite User"}
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-50 text-green-700">
              {userList.length} users
            </Badge>
            {/* Removed redundant per-list Export dropdown */}
          </div>
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
                        {Object.entries(user.permissions || {}).map(([permission, enabled]) => 
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
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit access"
                          aria-label="Edit access"
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                          aria-label={user.status === 'active' ? 'Deactivate' : 'Activate'}
                          className={user.status === 'active' ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.status === 'active' ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Resend invite"
                          aria-label="Resend invite"
                          className="text-gray-600 hover:text-gray-800"
                          onClick={() => handleResendInvite(user)}
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete user"
                          aria-label="Delete user"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => handleDeleteUser(user.id)}
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
              {/* Export dropdown in toolbar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExportAs('csv')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportAs('xlsx')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as Excel (XLSX)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportAs('pdf')}>
                    <File className="w-4 h-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      {/* Edit Access Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) setEditingUser(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit access</DialogTitle>
            <DialogDescription>
              {editingUser ? (
                <span>Update role and permissions for <strong>{editingUser.username}</strong> ({editingUser.email})</span>
              ) : (
                'Update role and permissions'
              )}
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={editingUser.role}
                  onChange={(e) => {
                    const role = e.target.value as 'admin' | 'seller';
                    setEditingUser(prev => prev ? { ...prev, role, permissions: defaultPermissionsByRole(role) } : prev);
                  }}
                >
                  <option value="seller">Seller</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Access permissions</h4>
                <div className="space-y-3 max-h-72 overflow-auto pr-1">
                  {Object.entries(editingUser.permissions || {}).map(([permission, enabled]) => (
                    <div key={permission} className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 capitalize">{permission}</label>
                      <input
                        type="checkbox"
                        checked={!!enabled}
                        onChange={(e) => setEditingUser(prev => prev ? {
                          ...prev,
                          permissions: { ...prev.permissions, [permission]: e.target.checked }
                        } : prev)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingUser(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessTab;
