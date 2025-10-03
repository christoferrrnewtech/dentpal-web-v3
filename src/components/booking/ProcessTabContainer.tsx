import React from 'react';
import ProcessTab from './ProcessTab';
import { useBookings } from '../../hooks/useBookings';

interface Props {
  onTabChange?: (tab: string) => void;
}

const ProcessTabContainer: React.FC<Props> = ({ onTabChange }) => {
  const { pending, loading, error, setError, setStatus, processAll } = useBookings();

  async function onPrintWaybill(orderId: string) {
    // TODO: implement real waybill printing
    try {
      // Placeholder action: open print dialog or generate label
      window.print?.();
    } catch (e) {
      setError('Failed to print waybill');
    }
  }

  async function onMarkComplete(orderId: string) {
    await setStatus(orderId, 'completed');
  }

  async function onProcessAllHandler() {
    await processAll();
  }

  return (
    <ProcessTab
      orders={pending}
      loading={loading}
      error={error}
      setError={setError}
      onPrintWaybill={onPrintWaybill}
      onMarkComplete={onMarkComplete}
      onProcessAll={onProcessAllHandler}
      onTabChange={onTabChange || (() => {})}
    />
  );
};

export default ProcessTabContainer;
