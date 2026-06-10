import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, Sprout, MessageCircle, TrendingUp, Plus, ChevronRight, AlertTriangle } from 'lucide-react';
import { farmsApi } from '../api/farms';
import { cropsApi } from '../api/crops';
import { useAuth } from '../hooks/useAuth';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: farms = [] } = useQuery({ queryKey: ['farms'], queryFn: farmsApi.list });
  const { data: crops = [] } = useQuery({ queryKey: ['crops'], queryFn: cropsApi.listAll });

  const activeCrops = crops.filter((c) => c.status === 'active');
  const soonToHarvest = activeCrops.filter((c) => {
    if (!c.expected_harvest_date) return false;
    const days = differenceInDays(new Date(c.expected_harvest_date), new Date());
    return days >= 0 && days <= 14;
  });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {user?.name?.split(' ')[0]} 🌱
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Here's what's happening on your farms.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Farms', value: farms.length, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50', to: '/farms' },
          { label: 'Active Crops', value: activeCrops.length, icon: Sprout, color: 'text-leaf-600', bg: 'bg-leaf-50', to: '/crops' },
          { label: 'Harvest Soon', value: soonToHarvest.length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', to: '/crops' },
          { label: 'AI Advisor', value: 'Chat', icon: MessageCircle, color: 'text-purple-600', bg: 'bg-purple-50', to: '/advisor' },
        ].map(({ label, value, icon: Icon, color, bg, to }) => (
          <Link key={label} to={to} className="card flex flex-col gap-2 hover:shadow-md transition">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Active crops */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Active Crops</h2>
          <Link to="/crops" className="text-sm text-leaf-600 hover:underline flex items-center gap-0.5">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {activeCrops.length === 0 ? (
          <div className="card text-center py-10">
            <Sprout className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No active crops yet.</p>
            <Link to="/farms" className="btn-primary mt-4 inline-flex">
              <Plus className="w-4 h-4" /> Add your first crop
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activeCrops.slice(0, 5).map((crop) => {
              const plantDate = crop.planting_date ? new Date(crop.planting_date) : null;
              const harvestDate = crop.expected_harvest_date ? new Date(crop.expected_harvest_date) : null;
              const daysToHarvest = harvestDate ? differenceInDays(harvestDate, new Date()) : null;

              return (
                <Link
                  key={crop.id}
                  to={`/crops/${crop.id}`}
                  className="card flex items-center justify-between hover:shadow-md transition py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-leaf-100 flex items-center justify-center text-lg">
                      🌿
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{crop.crop_type}{crop.variety ? ` · ${crop.variety}` : ''}</p>
                      <p className="text-xs text-gray-500">
                        {crop.farm_name} · {crop.plot_name}
                        {plantDate ? ` · planted ${formatDistanceToNow(plantDate)} ago` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {daysToHarvest !== null && (
                      <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                        daysToHarvest <= 7 ? 'bg-amber-100 text-amber-700'
                        : daysToHarvest <= 14 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-500'
                      }`}>
                        {daysToHarvest <= 0 ? 'Harvest!' : `${daysToHarvest}d to harvest`}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      {farms.length === 0 && (
        <div className="card bg-leaf-600 text-white">
          <h3 className="font-semibold mb-1">Set up your farm</h3>
          <p className="text-leaf-100 text-sm mb-4">Add your farm details to unlock AI-powered advice tailored to your land.</p>
          <Link to="/farms" className="inline-flex items-center gap-2 bg-white text-leaf-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-leaf-50 transition">
            <Plus className="w-4 h-4" /> Add farm
          </Link>
        </div>
      )}

      {/* Market teaser */}
      <div className="card border-leaf-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-leaf-600" />
            <span className="font-semibold text-gray-900 text-sm">Market Prices</span>
          </div>
          <Link to="/market" className="text-sm text-leaf-600 hover:underline flex items-center gap-0.5">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-gray-500 text-sm mt-2">Sri Lanka vegetable & crop prices from CBSL data.</p>
      </div>
    </div>
  );
}
