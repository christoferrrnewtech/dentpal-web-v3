import React, { useState, useMemo } from "react";
import UserSummaryCards from "./UserSummaryCards";
import UserFilters from "./UserFilters";
import UserTable from "./UserTable";
import UserDetailsDialog from "./UserDetailsDialog";
import ResetPointsDialog from "./ResetPointsDialog";
import { User, Filters } from "./types";
import { useUserRealtime } from "@/hooks/useUser";
import { updateUserSellerApproval, deleteUser } from "@/services/userService";


export default function UsersTab() {
  const { users, loading, resetPoints } = useUserRealtime();
  const [filters, setFilters] = useState<Filters>({search:'', location:'all', specialty:'all', status:'all'});
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<User|null>(null);
  const [isResetOpen, setResetOpen] = useState(false);

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

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser(id);
      setSelected(prev => prev.filter(sid => sid !== id));
    } catch (e) {
      console.error('Failed to delete user', e);
    }
  };

  const locations = useMemo(() => {
    return Array.from(
      new Set(
        users.flatMap(u => (u.shippingAddresses ?? []).map((a: any) => (typeof a === 'string' ? a : a?.city || a?.cityName || a?.addressLine1 || '')))
      )
    ).filter(Boolean);
  }, [users]);

  const specialties = useMemo(
    () => Array.from(new Set(users.map(u => u.specialty ?? ''))).filter(Boolean),
    [users]
  );

  const filtered = useMemo(() => {
    const q = (filters.search || '').trim().toLowerCase();
    return users.filter(u => {
      const matchesSearch =
        q === '' ||
        (u.accountId ?? '').toLowerCase().includes(q) ||
        `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q);
      const matchesStatus = filters.status === 'all' || u.status === filters.status;
      const matchesSpecialty = filters.specialty === 'all' || (u.specialty ?? '') === filters.specialty;
      const matchesLocation =
        filters.location === 'all' ||
        (u.shippingAddresses ?? []).some((a: any) => {
          const city = typeof a === 'string' ? a : a?.city || a?.cityName || a?.addressLine1 || '';
          return city === filters.location;
        });
      return matchesSearch && matchesStatus && matchesSpecialty && matchesLocation;
    });
  }, [users, filters]);

  if (loading) {
    return <div className="py-8 text-center">Loading users...</div>;
  }
  const onSelect = (id:string, checked:boolean) => setSelected(prev => checked ? [...prev,id] : prev.filter(p=>p!==id));
  const onSelectAll = (checked:boolean) => setSelected(checked ? filtered.map(u=>u.id) : []);
  const onView = (u:User) => setSelectedUser(u);
  const onEdit = (u:User) => setSelectedUser(u);

  return (
    <div className="space-y-6">
      <UserSummaryCards totalUsers={users.length} activeUsers={users.filter(u=>u.status==='active').length} totalRevenue={users.reduce((s,u)=>s+u.totalSpent,0)} totalOrders={users.reduce((s,u)=>s+u.totalTransactions,0)} />
      <UserFilters filters={filters} locations={locations} specialties={specialties} onChange={setFilters} />
      <UserTable
        users={filtered}
        selected={selected}
        onSelect={onSelect}
        onSelectAll={onSelectAll}
        onView={onView}
        onEdit={onEdit}
        onDelete={handleDeleteUser}
        onChangeSellerApproval={handleChangeSellerApproval}
      />
      <UserDetailsDialog user={selectedUser} open={!!selectedUser} onClose={()=>setSelectedUser(null)} />
      <ResetPointsDialog open={isResetOpen} label={selected.length ? `${selected.length} users` : 'user'} onCancel={()=>setResetOpen(false)} onConfirm={handleConfirmReset} />
    </div>
  );
}