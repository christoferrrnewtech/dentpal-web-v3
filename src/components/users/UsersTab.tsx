import React, { useState, useMemo, useEffect } from "react";
import UserSummaryCards from "./UserSummaryCards";
import UserFilters from "./UserFilters";
import UserTable from "./UserTable";
import UserDetailsDialog from "./UserDetailsDialog";
import ResetPointsDialog from "./ResetPointsDialog";
import { User, Filters } from "./types";
import { useUserRealtime } from "@/hooks/useUser";
import { updateUserSellerApproval, deleteUser, updateUserStatus } from "@/services/userService";
import { getProvinces as getPhProvinces } from '@/lib/phLocations';


export default function UsersTab() {
  const { users, loading, resetPoints } = useUserRealtime();
  const [filters, setFilters] = useState<Filters>({search:'', province:'all', specialty:'all', status:'all'});
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<User|null>(null);
  const [isResetOpen, setResetOpen] = useState(false);
  const [phProvinces, setPhProvinces] = useState<Array<{ code: string; name: string }>>([]);

  // Load provinces on mount
  useEffect(() => {
    (async () => {
      try {
        const provinces = await getPhProvinces();
        console.log('[UsersTab] Loaded provinces:', provinces.length, provinces.slice(0, 5));
        
        // Add "Metro Manila" as a special entry if not already present
        const hasMetroManila = provinces.some(p => 
          p.name.toLowerCase().includes('metro manila') || 
          p.code === 'NCR' ||
          p.code === 'METRO_MANILA'
        );
        
        if (!hasMetroManila) {
          // Add Metro Manila at the beginning
          provinces.unshift({ code: 'METRO_MANILA', name: 'Metro Manila' });
          console.log('[UsersTab] Added Metro Manila to province list');
        }
        
        setPhProvinces(provinces);
      } catch (error) {
        console.error('Failed to load provinces:', error);
        // Fallback: add Metro Manila
        setPhProvinces([{ code: 'METRO_MANILA', name: 'Metro Manila' }]);
      }
    })();
  }, []);

  async function handleConfirmReset() {
    if (selected.length === 0) return;
    try {
      await resetPoints(selected); // bulk or single
    } catch (err) {
      // optionally surface error via toast in the container
      console.error('Failed to reset points', err);
    } finally {
      setResetOpen(false);
      setSelected([]);
    }
  }

  const handleChangeSellerApproval = async (id: string, status: User['sellerApprovalStatus']) => {
    try {
      await updateUserSellerApproval(id, status);
    } catch (e) {
      console.error('Failed to update seller approval status', e);
    }
  };

  const handleToggleUserStatus = async (id: string, currentStatus: User['status']) => {
    try {
      const newStatus: User['status'] = currentStatus === 'active' ? 'inactive' : 'active';
      await updateUserStatus(id, newStatus);
    } catch (e) {
      console.error('Failed to toggle user status', e);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser(id);
      setSelected(prev => prev.filter(sid => sid !== id));
    } catch (e) {
      console.error('Failed to delete user', e);
    }
  };

  // Helper function to get user's province from their default or first address
  const getUserProvince = (user: User): string | null => {
    // Helper to match province name to code
    const findProvinceCode = (provinceName: string): string | null => {
      if (!provinceName) return null;
      const normalized = provinceName.toLowerCase().trim();
      
      // Special case: Map "Metro Manila" to our custom code
      if (normalized === 'metro manila' || normalized === 'ncr' || normalized.includes('national capital region')) {
        return 'METRO_MANILA';
      }
      
      const match = phProvinces.find(p => 
        p.name.toLowerCase() === normalized ||
        p.code === provinceName || // In case it's already a code
        p.code.toLowerCase() === normalized
      );
      return match ? match.code : null;
    };

    // Check Firebase User > Address field first
    if (user.addresses && Array.isArray(user.addresses) && user.addresses.length > 0) {
      // Find default address
      const defaultAddress = user.addresses.find((addr: any) => addr?.isDefault === true);
      if (defaultAddress) {
        // Try provinceCode first
        if (defaultAddress.provinceCode) return defaultAddress.provinceCode;
        // Try province field
        if (defaultAddress.province) {
          const code = findProvinceCode(defaultAddress.province);
          if (code) return code;
        }
        // Try state field (common in Firebase addresses)
        if (defaultAddress.state) {
          const code = findProvinceCode(defaultAddress.state);
          if (code) return code;
        }
        // Try country field as fallback (sometimes misused for province)
        if (defaultAddress.country === 'Philippines' && defaultAddress.state) {
          const code = findProvinceCode(defaultAddress.state);
          if (code) return code;
        }
      }
      
      // Fallback to first address with province data
      for (const addr of user.addresses) {
        if (addr?.provinceCode) return addr.provinceCode;
        if (addr?.province) {
          const code = findProvinceCode(addr.province);
          if (code) return code;
        }
        if (addr?.state) {
          const code = findProvinceCode(addr.state);
          if (code) return code;
        }
      }
    }
    
    // Fallback to shippingAddresses if addresses field doesn't exist
    if (user.shippingAddresses && Array.isArray(user.shippingAddresses) && user.shippingAddresses.length > 0) {
      for (const addr of user.shippingAddresses) {
        if (typeof addr === 'object' && addr !== null) {
          const a = addr as any;
          if (a.isDefault === true) {
            if (a.provinceCode) return a.provinceCode;
            if (a.province) {
              const code = findProvinceCode(a.province);
              if (code) return code;
            }
            if (a.state) {
              const code = findProvinceCode(a.state);
              if (code) return code;
            }
          }
        }
      }
      // Try first address object
      const firstObj = user.shippingAddresses.find(addr => typeof addr === 'object' && addr !== null) as any;
      if (firstObj) {
        if (firstObj.provinceCode) return firstObj.provinceCode;
        if (firstObj.province) {
          const code = findProvinceCode(firstObj.province);
          if (code) return code;
        }
        if (firstObj.state) {
          const code = findProvinceCode(firstObj.state);
          if (code) return code;
        }
      }
    }
    
    return null;
  };

  const specialties = useMemo(() => {
    // Flatten all specialty arrays and get unique values
    const allSpecialties = users.flatMap(u => u.specialty || []);
    const uniqueSpecialties = Array.from(new Set(allSpecialties)).filter(Boolean);
    console.log('[UsersTab] Loaded specialties from Firebase User > specialty (array):', uniqueSpecialties);
    console.log('[UsersTab] Sample users with specialty:', users.slice(0, 3).map(u => ({ 
      id: u.id, 
      email: u.email, 
      specialty: u.specialty 
    })));
    return uniqueSpecialties;
  }, [users]);

  const filtered = useMemo(() => {
    const q = (filters.search || '').trim().toLowerCase();
    const result = users.filter(u => {
      const matchesSearch =
        q === '' ||
        (u.accountId ?? '').toLowerCase().includes(q) ||
        `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q);
      const matchesStatus = filters.status === 'all' || u.status === filters.status;
      const matchesSpecialty = filters.specialty === 'all' || (u.specialty || []).includes(filters.specialty);
      
      // Debug log for specialty filter (first user when specialty filter active)
      if (filters.specialty !== 'all' && u === users[0]) {
        console.log('[UsersTab] Specialty Filter Debug:', {
          filterSpecialty: filters.specialty,
          userSpecialties: u.specialty,
          matches: matchesSpecialty,
          userEmail: u.email
        });
      }
      
      // Province filtering based on User > Address with debug logging
      const userProvince = getUserProvince(u);
      const matchesProvince = 
        filters.province === 'all' || 
        userProvince === filters.province;
      
      // Debug log for first user when province filter is active
      if (filters.province !== 'all' && u === users[0]) {
        console.log('[UsersTab] Province Filter Debug:', {
          filterProvince: filters.province,
          filterProvinceName: phProvinces.find(p => p.code === filters.province)?.name,
          userProvince: userProvince,
          userProvinceName: phProvinces.find(p => p.code === userProvince)?.name,
          matches: matchesProvince,
          userEmail: u.email,
          addresses: u.addresses,
          shippingAddresses: u.shippingAddresses
        });
      }
      
      return matchesSearch && matchesStatus && matchesSpecialty && matchesProvince;
    });
    
    console.log(`[UsersTab] Filtered ${result.length} users out of ${users.length} (province: ${filters.province})`);
    return result;
  }, [users, filters, phProvinces]);

  if (loading) {
    return <div className="py-8 text-center">Loading users...</div>;
  }
  const onSelect = (id:string, checked:boolean) => setSelected(prev => checked ? [...prev,id] : prev.filter(p=>p!==id));
  const onSelectAll = (checked:boolean) => setSelected(checked ? filtered.map(u=>u.id) : []);
  const onView = (u:User) => setSelectedUser(u);
  const onEdit = (u:User) => setSelectedUser(u);

  return (
    <div className="space-y-6">
      <UserSummaryCards totalUsers={filtered.length} activeUsers={filtered.filter(u=>u.status==='active').length} totalRevenue={filtered.reduce((s,u)=>s+u.totalSpent,0)} totalOrders={filtered.reduce((s,u)=>s+u.totalTransactions,0)} />
      <UserFilters filters={filters} provinces={phProvinces} specialties={specialties} onChange={setFilters} />
      <UserTable
        users={filtered}
        selected={selected}
        onSelect={onSelect}
        onSelectAll={onSelectAll}
        onView={onView}
        onEdit={onEdit}
        onDelete={handleDeleteUser}
        onChangeSellerApproval={handleChangeSellerApproval}
        onToggleStatus={handleToggleUserStatus}
      />
      <UserDetailsDialog user={selectedUser} open={!!selectedUser} onClose={()=>setSelectedUser(null)} />
      <ResetPointsDialog open={isResetOpen} label={selected.length ? `${selected.length} users` : 'user'} onCancel={()=>setResetOpen(false)} onConfirm={handleConfirmReset} />
    </div>
  );
}