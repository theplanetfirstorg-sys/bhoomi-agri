import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Sprout, ChevronRight, Loader2, Sun, Droplets, MapPin } from 'lucide-react';
import { farmsApi } from '../api/farms';
import { Plot } from '../types';

const SUN_OPTIONS = ['full_sun', 'partial_shade', 'full_shade'];
const IRRIGATION_OPTIONS = ['drip', 'sprinkler', 'flood', 'manual', 'rainwater', 'none'];
const DRAINAGE_OPTIONS = ['excellent', 'good', 'moderate', 'poor', 'waterlogged'];
const WATER_SOURCES = ['well', 'river', 'municipal', 'rainwater', 'tank', 'stream'];

export default function FarmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [plotForm, setPlotForm] = useState({
    name: '', area: '', area_unit: 'perches', orientation: '',
    sun_exposure: 'full_sun', drainage: 'good', irrigation_method: 'manual',
    water_source: 'well', soil_ph: '', notes: '',
  });

  const { data: farm, isLoading: farmLoading } = useQuery({
    queryKey: ['farm', id],
    queryFn: () => farmsApi.get(id!),
    enabled: !!id,
  });

  const { data: plots = [], isLoading: plotsLoading } = useQuery({
    queryKey: ['plots', id],
    queryFn: () => farmsApi.getPlots(id!),
    enabled: !!id,
  });

  const createPlotMutation = useMutation({
    mutationFn: (data: Partial<Plot>) => farmsApi.createPlot(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plots', id] });
      setShowPlotForm(false);
    },
  });

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setPlotForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmitPlot(e: React.FormEvent) {
    e.preventDefault();
    createPlotMutation.mutate({
      ...plotForm,
      area: plotForm.area ? parseFloat(plotForm.area) : undefined,
      soil_ph: plotForm.soil_ph ? parseFloat(plotForm.soil_ph) : undefined,
    } as Partial<Plot>);
  }

  if (farmLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-leaf-500" /></div>;
  if (!farm) return <div className="card text-center py-12 text-gray-500">Farm not found.</div>;

  return (
    <div className="space-y-5">
      {/* Farm header */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-earth-100 flex items-center justify-center text-2xl">🌾</div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{farm.name}</h1>
            <p className="text-gray-500 text-sm flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {farm.region ?? 'Sri Lanka'}
              {farm.total_area ? ` · ${farm.total_area} ${farm.area_unit}` : ''}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Soil type</p>
            <p className="font-medium capitalize">{farm.soil_type}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Farming type</p>
            <p className="font-medium capitalize">{farm.farming_type.replace('_', ' ')}</p>
          </div>
          {farm.elevation_m && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">Elevation</p>
              <p className="font-medium">{farm.elevation_m}m</p>
            </div>
          )}
        </div>
      </div>

      {/* Plots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Plots ({plots.length})</h2>
          <button onClick={() => setShowPlotForm(!showPlotForm)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add plot
          </button>
        </div>

        {showPlotForm && (
          <div className="card border-leaf-200 mb-4">
            <h3 className="font-semibold text-gray-900 mb-4">New Plot</h3>
            <form onSubmit={handleSubmitPlot} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Plot name *</label>
                  <input type="text" className="input" placeholder="North bed, Main field..." value={plotForm.name} onChange={update('name')} required />
                </div>
                <div>
                  <label className="label">Area</label>
                  <div className="flex gap-2">
                    <input type="number" className="input flex-1" placeholder="5" value={plotForm.area} onChange={update('area')} min="0" step="0.01" />
                    <select className="input w-28" value={plotForm.area_unit} onChange={update('area_unit')}>
                      {['perches', 'acres', 'hectares', 'sqm'].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Sun exposure</label>
                  <select className="input" value={plotForm.sun_exposure} onChange={update('sun_exposure')}>
                    {SUN_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Drainage</label>
                  <select className="input" value={plotForm.drainage} onChange={update('drainage')}>
                    {DRAINAGE_OPTIONS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Irrigation method</label>
                  <select className="input" value={plotForm.irrigation_method} onChange={update('irrigation_method')}>
                    {IRRIGATION_OPTIONS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Water source</label>
                  <select className="input" value={plotForm.water_source} onChange={update('water_source')}>
                    {WATER_SOURCES.map((w) => <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Orientation</label>
                  <input type="text" className="input" placeholder="North-South" value={plotForm.orientation} onChange={update('orientation')} />
                </div>
                <div>
                  <label className="label">Soil pH</label>
                  <input type="number" className="input" placeholder="6.5" value={plotForm.soil_ph} onChange={update('soil_ph')} min="0" max="14" step="0.1" />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={plotForm.notes} onChange={update('notes')} />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={createPlotMutation.isPending} className="btn-primary">
                  {createPlotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save plot
                </button>
                <button type="button" onClick={() => setShowPlotForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {plotsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-leaf-500" /></div>
        ) : plots.length === 0 ? (
          <div className="card text-center py-10">
            <Sprout className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No plots yet. Add a plot to start tracking crops.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {plots.map((plot) => (
              <Link key={plot.id} to={`/crops?plotId=${plot.id}`}
                className="card flex items-center justify-between hover:shadow-md transition py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-leaf-50 flex items-center justify-center text-lg">🪴</div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{plot.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      {plot.area && <span>{plot.area} {plot.area_unit}</span>}
                      {plot.sun_exposure && (
                        <span className="flex items-center gap-0.5">
                          <Sun className="w-3 h-3" /> {plot.sun_exposure.replace('_', ' ')}
                        </span>
                      )}
                      {plot.irrigation_method && (
                        <span className="flex items-center gap-0.5">
                          <Droplets className="w-3 h-3" /> {plot.irrigation_method}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
