import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronRight, ShieldCheck, UserRound } from 'lucide-react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';

interface ProfileCompletionPromptProps {
  className?: string;
}

const ProfileCompletionPrompt: React.FC<ProfileCompletionPromptProps> = ({ className }) => {
  const navigate = useNavigate();
  const { loading, percent, isComplete, issues } = useProfileCompletion();

  if (loading || isComplete) return null;

  const goToProfile = () => navigate('/?tab=profile');

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm ${className || ''}`}>
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-100/60" />
      <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-amber-100/60" />

      <div className="relative z-10 p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 mt-0.5">
            <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200">
              <UserRound className="h-5 w-5 text-amber-700" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-amber-900">Complete your profile</h3>
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                <AlertCircle className="h-3.5 w-3.5" /> {percent}% complete
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-800/90">Help us keep your account secure and verified. Finish these steps to unlock all features.</p>

            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {issues.slice(0, 4).map((i) => (
                <li key={i.id} className="flex items-center gap-2 text-xs text-amber-900">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 border border-amber-200 text-amber-700">•</span>
                  {i.label}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={goToProfile}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
              >
                Continue setup
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1 text-[11px] text-amber-800/90">
                <ShieldCheck className="h-3.5 w-3.5" /> Your information is encrypted
              </div>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1">
            <div className="text-xs text-amber-800/90">Progress</div>
            <div className="w-28 h-2 bg-amber-100 rounded-full overflow-hidden border border-amber-200">
              <div className="h-full bg-amber-500" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionPrompt;
