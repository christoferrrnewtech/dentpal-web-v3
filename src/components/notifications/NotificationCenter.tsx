import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronRight, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';

const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { isComplete, loading } = useProfileCompletion();

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const hasAlerts = !loading && !isComplete;

  const goToProfile = () => {
    console.log('[Notification] Go to profile clicked');
    setOpen(false);
    try { window.dispatchEvent(new CustomEvent('dentpal:navigate', { detail: { tab: 'profile' } })); } catch {}
    navigate('/?tab=profile');
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {hasAlerts && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl z-50">
          <div className="p-3 border-b border-gray-100">
            <div className="text-sm font-semibold text-gray-900">Notifications</div>
          </div>

          <div className="p-1">
            {/* Single, simple actionable notification */}
            {!loading && !isComplete && (
              <button
                onClick={goToProfile}
                className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
              >
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200">
                  <IdCard className="h-4 w-4 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">Complete your profile</div>
                  <div className="text-xs text-gray-600">Continue setup</div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            )}

            {loading && (
              <div className="p-3 text-xs text-gray-500">Loading…</div>
            )}

            {!loading && isComplete && (
              <div className="p-3 text-xs text-gray-500">No new notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
