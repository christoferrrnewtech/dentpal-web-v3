import { useCallback, useEffect, useState } from 'react';
import type { Order } from '../types/order';
import { BookingService } from '../services/booking';

export function useBookings() {
  const [pending, setPending] = useState<Order[]>([]);
  const [processing, setProcessing] = useState<Order[]>([]);
  const [completed, setCompleted] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubP = BookingService.listenByStatus('pending', setPending);
    const unsubProc = BookingService.listenByStatus('processing', setProcessing);
    const unsubC = BookingService.listenByStatus('completed', setCompleted);
    setLoading(false);
    return () => {
      unsubP();
      unsubProc();
      unsubC();
    };
  }, []);

  const add = useCallback(async (incoming: Partial<Order>) => {
    try {
      await BookingService.create(incoming);
      setError(null);
    } catch (e) {
      setError('Failed to add booking');
    }
  }, []);

  const setStatus = useCallback(async (id: string, status: Order['status']) => {
    try {
      await BookingService.updateStatus(id, status);
      setError(null);
    } catch (e) {
      setError('Failed to update booking status');
    }
  }, []);

  const processAll = useCallback(async () => {
    try {
      const ids = pending.map((b) => b.id);
      if (ids.length === 0) return;
      await BookingService.bulkUpdateStatus(ids, 'processing');
      setError(null);
    } catch (e) {
      setError('Failed to process all');
    }
  }, [pending]);

  return { pending, processing, completed, loading, error, add, setStatus, processAll, setError };
}
