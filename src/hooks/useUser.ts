import { useEffect, useState, useCallback } from 'react';
import type { User } from '@/components/users/types';
import { listenUsers, fetchUsers, updateUserRewardPoints } from '@/services/userService';

export function useUserRealtime() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = listenUsers(u => {
      setUsers(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    const u = await fetchUsers();
    setUsers(u);
    setLoading(false);
  }, []);

  const resetPoints = useCallback(async (uids: string[] | string, points = 0) => {
    const ids = Array.isArray(uids) ? uids : [uids];
    await Promise.all(ids.map(id => updateUserRewardPoints(id, points)));
    await refetch();
  }, [refetch]);

  return { users, loading, refetch, resetPoints };
}