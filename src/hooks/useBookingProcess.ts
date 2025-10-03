import { useCallback, useEffect, useState } from 'react';
import type { Order } from '../types/order';
import { BookingService } from '../services/booking';

export function useBookingProcess() {
  const [processing, setProcessing] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = BookingService.listenByStatus('processing', (rows) => {
      setProcessing(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const startProcessing = useCallback(async (id: string) => {
    try {
      await BookingService.updateStatus(id, 'processing');
      setError(null);
    } catch (e) {
      setError('Failed to start processing');
    }
  }, []);

  const markCompleted = useCallback(async (id: string) => {
    try {
      await BookingService.updateStatus(id, 'completed');
      setError(null);
    } catch (e) {
      setError('Failed to mark completed');
    }
  }, []);

  return {
    processing,
    loading,
    error,
    startProcessing,
    markCompleted,
    setError,
  };
}
