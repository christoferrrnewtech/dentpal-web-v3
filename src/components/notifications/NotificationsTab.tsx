import React from 'react';
import { IdCard, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';

const NotificationsTab: React.FC = () => {
  const navigate = useNavigate();
  const { loading, isComplete } = useProfileCompletion();

  const goToProfile = () => {
    try {
      window.dispatchEvent(new CustomEvent('dentpal:navigate', { detail: { tab: 'profile' } }));
    } catch {}
    navigate('/?tab=profile');
  };

  return (
    <div className="space-y-3">
      {!loading && !isComplete && (
        <button
          onClick={goToProfile}
          className="w-full text-left flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition"
        >
          <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border border-amber-200">
            <IdCard className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900">Complete your profile</div>
            <div className="text-xs text-gray-700">Continue setup to finish vendor enrollment</div>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-700" />
        </button>
      )}

      {loading && (
        <div className="p-4 text-sm text-gray-500 border rounded-xl bg-white">Loading notifications…</div>
      )}

      {!loading && isComplete && (
        <div className="p-8 text-center border rounded-xl bg-white">
          <div className="text-sm text-gray-600">No new notifications</div>
        </div>
      )}
    </div>
  );
};

export default NotificationsTab;
