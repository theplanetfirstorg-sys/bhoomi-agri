import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, ChevronRight } from 'lucide-react';
import api from '../api/client';
import { format } from 'date-fns';

interface Farmer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  last_active_at: string | null;
  created_at: string;
  farm_count: number;
}

export default function FarmersPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Farmer | null>(null);
  const [extendDays, setExtendDays] = useState('30');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-farmers'],
    queryFn: () => api.get<{ farmers: Farmer[] }>('/admin/farmers').then((r) => r.data),
  });

  const updateSub = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: Record<string, unknown> }) =>
      api.put(`/admin/farmers/${userId}/subscription`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-farmers'] }); setSelected(null); },
  });

  const impersonate = useMutation({
    mutationFn: (userId: string) =>
      api.post<{ token: string; farmer: { email: string } }>(`/admin/farmers/${userId}/impersonate`).then((r) => r.data),
    onSuccess: (data) => {
      alert(`Impersonating ${data.farmer.email}. Token: ${data.token}`);
    },
  });

  const farmers = (data?.farmers ?? []).filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.email.toLowerCase().includes(search.toLowerCase())
  );

  const statusClass = (s: string) => ({
    trial: 'bg-amber-100 text-amber-700',
    active: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }[s] ?? 'bg-gray-100 text-gray-500');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Farmers</h1>
        <span className="text-sm text-gray-500">{data?.farmers.length ?? 0} total</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/20 focus:border-leaf-500" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-leaf-500" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Farmer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Farms</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Last active</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {farmers.map((farmer) => (
                <tr key={farmer.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{farmer.name}</div>
                    <div className="text-xs text-gray-500">{farmer.email}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(farmer.subscription_status)}`}>
                      {farmer.subscription_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">{farmer.farm_count}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                    {farmer.last_active_at ? format(new Date(farmer.last_active_at), 'MMM d, yyyy') : 'Never'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                    {format(new Date(farmer.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(farmer)} className="text-gray-400 hover:text-gray-700">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Farmer management modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">{selected.name}</h2>
            <p className="text-sm text-gray-500">{selected.email} · Status: <strong>{selected.subscription_status}</strong></p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Extend subscription (days)</label>
              <input type="number" className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} min="1" />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => updateSub.mutate({ userId: selected.id, body: { extends_days: parseInt(extendDays), status: 'active' } })}
                disabled={updateSub.isPending}
                className="flex-1 bg-leaf-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-leaf-700 transition disabled:opacity-50"
              >
                Extend & activate
              </button>
              <button
                onClick={() => updateSub.mutate({ userId: selected.id, body: { status: 'expired' } })}
                disabled={updateSub.isPending}
                className="flex-1 bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-red-700 transition disabled:opacity-50"
              >
                Expire
              </button>
            </div>

            <button
              onClick={() => impersonate.mutate(selected.id)}
              disabled={impersonate.isPending}
              className="w-full border border-gray-300 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition"
            >
              Impersonate (support)
            </button>

            <button onClick={() => setSelected(null)} className="w-full text-sm text-gray-500 hover:text-gray-700 text-center">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
