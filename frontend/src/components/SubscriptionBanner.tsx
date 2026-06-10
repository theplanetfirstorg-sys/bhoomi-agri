import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

export default function SubscriptionBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!user || dismissed) return null;

  if (user.subscription_status === 'trial' && user.trial_ends_at) {
    const trialEnd = new Date(user.trial_ends_at);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000);

    if (daysLeft > 7) return null; // Only show when <= 7 days left

    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            {daysLeft <= 0
              ? 'Your free trial has ended.'
              : `Free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`}{' '}
            <button
              onClick={() => navigate('/subscription')}
              className="font-semibold underline hover:no-underline"
            >
              Subscribe now
            </button>
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-600 hover:text-amber-900">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (user.subscription_status === 'expired' || user.subscription_status === 'cancelled') {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            Your subscription has expired. You have read-only access.{' '}
            <button
              onClick={() => navigate('/subscription')}
              className="font-semibold underline hover:no-underline"
            >
              Renew subscription
            </button>
          </span>
        </div>
      </div>
    );
  }

  return null;
}
