import { useQuery } from '@tanstack/react-query';
import { Users, Sprout, MessageCircle, Bell, Loader2 } from 'lucide-react';
import api from '../api/client';

interface Analytics {
  users: { total: string; trial: string; active: string; expired: string };
  farms: { count: string };
  crops: { count: string; active: string };
  conversations: { count: string; queries: string };
  alerts: { pending: string };
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get<Analytics>('/admin/analytics').then((r) => r.data),
  });

  const stats = data ? [
    { label: 'Total farmers', value: data.users.total, sub: `${data.users.active} active · ${data.users.trial} trial · ${data.users.expired} expired`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active farms', value: data.farms.count, icon: Sprout, color: 'text-leaf-600', bg: 'bg-leaf-50' },
    { label: 'AI queries', value: data.conversations.queries ?? '0', sub: `${data.conversations.count} conversations`, icon: MessageCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Pending alerts', value: data.alerts.pending, icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50' },
  ] : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-leaf-500" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{label}</div>
              {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
