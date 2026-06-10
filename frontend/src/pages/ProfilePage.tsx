import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { User, Crown, LogOut } from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (!user) return null;

  const statusBadge = {
    trial: 'badge-trial',
    active: 'badge-active',
    expired: 'badge-expired',
    cancelled: 'badge-expired',
  }[user.subscription_status] ?? 'badge-trial';

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-leaf-100 flex items-center justify-center">
            <User className="w-7 h-7 text-leaf-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-1">Subscription</p>
            <span className={statusBadge}>{user.subscription_status}</span>
          </div>
          {user.trial_ends_at && user.subscription_status === 'trial' && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Trial ends</p>
              <p className="font-medium">{format(new Date(user.trial_ends_at), 'MMM d, yyyy')}</p>
            </div>
          )}
          {user.subscription_ends_at && user.subscription_status === 'active' && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Renews</p>
              <p className="font-medium">{format(new Date(user.subscription_ends_at), 'MMM d, yyyy')}</p>
            </div>
          )}
        </div>
      </div>

      {(user.subscription_status === 'expired' || user.subscription_status === 'trial') && (
        <div className="card bg-leaf-600 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-yellow-300" />
            <h3 className="font-semibold">Upgrade your plan</h3>
          </div>
          <p className="text-leaf-100 text-sm mb-4">
            Unlock unlimited AI queries, more farms and plots, and priority support.
          </p>
          <button
            onClick={() => navigate('/subscription')}
            className="bg-white text-leaf-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-leaf-50 transition inline-flex items-center gap-2"
          >
            <Crown className="w-4 h-4" /> View plans
          </button>
        </div>
      )}

      <div className="card">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 text-sm font-medium hover:text-red-700 transition min-h-0"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
