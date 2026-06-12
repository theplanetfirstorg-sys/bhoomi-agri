import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Sprout, ChevronRight, Loader2, Sun, Droplets, MapPin, Pencil, X } from 'lucide-react';
import { farmsApi } from '../api/farms';
import { Farm, Plot } from '../types';

const SRI_LANKA_REGIONS = [
  'Western Province', 'Central Province', 'Southern Province', 'Northern Province',
  'Eastern Province', 'North Western Province', 'North Central Province',
  'Uva Province', 'Sabaragamuwa Province',
];
const SOIL_TYPES = ['clay', 'sandy', 'loamy', 'silt', 'peat', 'chalk', 'unknown'];
const FARMING_TYPES = ['home_garden', 'smallholder', 'commercial', 'organic', 'mixed'];
const farmingTypeLabels: Record<string, string> = {
  home_garden: 'Home Garden', smallholder: 'Smallholder', commercial: 'Commercial',
  organic: 'Organic', mixed: 'Mixed',
};

const SUN_OPTIONS = ['full_sun', 'partial_shade', 'full_shade'];
const IRRIGATION_OPTIONS = ['drip', 'sprinkler', 'flood', 'manual', 'rainwater', 'none'];
const DRAINAGE_OPTIONS = ['excellent', 'good', 'moderate', 'poor', 'waterlogged'];
const WATER_SOURCES = ['well', 'river', 'municipal', 'rainwater', 'tank', 'stream'];

const emptyPlotForm = {
  name: '', area: '', area_unit: 'perches', orientation: '',
  sun_exposure: 'full_sun', drainage: 'good', irrigation_method: 'manual',
  water_source: 'well', soil_ph: '', notes: '',
};

function plotToForm(plot: Plot) {
  return {
    name: plot.name ?? '',
    area: plot.area != null ? String(plot.area) : '',
    area_unit: plot.area_unit ?? 'perches',
    orientation: plot.orientation ?? '',
    sun_exposure: plot.sun_exposure ?? 'full_sun',
    drainage: plot.drainage ?? 'good',
    irrigation_method: plot.irrigation_method ?? 'manual',
    water_source: plot.water_source ?? 'well',
    soil_ph: plot.soil_ph != null ? String(plot.soil_ph) : '',
    notes: plot.notes ?? '',
  };
}

export default function FarmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [showFarmEdit, setShowFarmEdit] = useState(false);
  const [farmForm, setFarmForm] = useState({
    name: '', region: '', address: '', total_area: '', area_unit: 'perches',
    soil_type: 'unknown', farming_type: 'home_garden', notes: '',
  });

  const [showPlotForm, setShowPlotForm] = useState(false);
  const [editingPlotId, setEditingPlotId] = useState<string | null>(null);
  const [plotForm, setPlotForm] = useState(emptyPlotForm);

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

  const updateFarmMutation = useMutation({
    mutationFn: (data: Partial<Farm>) => farmsApi.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farm', id] });
      qc.invalidateQueries({ queryKey: ['farms'] });
      setShowFarmEdit(false);
    },
  });

  const createPlotMutation = useMutation({
    mutationFn: (data: Partial<Plot>) => farmsApi.createPlot(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plots', id] });
      setShowPlotForm(false);
      setPlotForm(emptyPlotForm);
    },
  });

  const updatePlotMutation = useMutation({
    mutationFn: ({ plotId, data }: { plotId: string; data: Partial<Plot> }) =>
      farmsApi.updatePlot(plotId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plots', id] });
      setEditingPlotId(null);
    },
  });

  function updateFarmField(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFarmForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function updatePlotField(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setPlotForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function startFarmEdit() {
    if (!farm) return;
    setFarmForm({
      name: farm.name ?? '',
      region: farm.region ?? '',
      address: farm.address ?? '',
      total_area: farm.total_area != null ? String(farm.total_area) : '',
      area_unit: farm.area_unit ?? 'perches',
      soil_type: farm.soil_type ?? 'unknown',
      farming_type: farm.farming_type ?? 'home_garden',
      notes: farm.notes ?? '',
    });
    setShowFarmEdit(true);
  }

  function startPlotEdit(plot: Plot) {
    setEditingPlotId(plot.id);
    setPlotForm(plotToForm(plot));
    setShowPlotForm(false);
  }

  function handleFarmUpdate(e: React.FormEvent) {
    e.preventDefault();
    updateFarmMutation.mutate({
      ...farmForm,
      total_area: farmForm.total_area ? parseFloat(farmForm.total_area) : undefined,
    } as Partial<Farm>);
  }

  function handlePlotCreate(e: React.FormEvent) {
    e.preventDefault();
    createPlotMutation.mutate({
      ...plotForm,
      area: plotForm.area ? parseFloat(plotForm.area) : undefined,
      soil_ph: plotForm.soil_ph ? parseFloat(plotForm.soil_ph) : undefined,
    } as Partial<Plot>);
  }

  function handlePlotUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPlotId) return;
    updatePlotMutation.mutate({
      plotId: editingPlotId,
      data: {
        ...plotForm,
        area: plotForm.area ? parseFloat(plotForm.area) : undefined,
        soil_ph: plotForm.soil_ph ? parseFloat(plotForm.soil_ph) : undefined,
      } as Partial<Plot>,
    });
  }

  function PlotForm({ onSubmit, isPending, onCancel, submitLabel, error }: {
    onSubmit: (e: React.FormEvent) => void;
    isPending: boolean;
    onCancel: () => void;
    submitLabel: string;
    error?: string;
  }) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Plot name *</label>
            <input type="text" className="input" placeholder="North bed, Main field..." value={plotForm.name} onChange={updatePlotField('name')} required />
          </div>
          <div>
            <label className="label">Area</label>
            <div className="flex gap-2">
              <input type="number" className="input flex-1" placeholder="5" value={plotForm.area} onChange={updatePlotField('area')} min="0" step="0.01" />
              <select className="input w-28" value={plotForm.area_unit} onChange={updatePlotField('area_unit')}>
                {['perches', 'acres', 'hectares', 'sqm'].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Sun exposure</label>
            <select className="input" value={plotForm.sun_exposure} onChange={updatePlotField('sun_exposure')}>
              {SUN_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Drainage</label>
            <select className="input" value={plotForm.drainage} onChange={updatePlotField('drainage')}>
              {DRAINAGE_OPTIONS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Irrigation method</label>
            <select className="input" value={plotForm.irrigation_method} onChange={updatePlotField('irrigation_method')}>
              {IRRIGATION_OPTIONS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Water source</label>
            <select className="input" value={plotForm.water_source} onChange={updatePlotField('water_source')}>
              {WATER_SOURCES.map((w) => <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Orientation</label>
            <input type="text" className="input" placeholder="North-South" value={plotForm.orientation} onChange={updatePlotField('orientation')} />
          </div>
          <div>
            <label className="label">Soil pH</label>
            <input type="number" className="input" placeholder="6.5" value={plotForm.soil_ph} onChange={updatePlotField('soil_ph')} min="0" max="14" step="0.1" />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={plotForm.notes} onChange={updatePlotField('notes')} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitLabel}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        </div>
      </form>
    );
  }

  if (farmLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-leaf-500" /></div>;
  if (!farm) return <div className="card text-center py-12 text-gray-500">Farm not found.</div>;

  return (
    <div className="space-y-5">
      {/* Farm header */}
      {showFarmEdit ? (
        <div className="card border-leaf-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Edit Farm</h2>
            <button onClick={() => setShowFarmEdit(false)} className="text-gray-400 hover:text-gray-600 min-h-0 p-1"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleFarmUpdate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Farm name *</label>
                <input type="text" className="input" value={farmForm.name} onChange={updateFarmField('name')} required />
              </div>
              <div>
                <label className="label">Region</label>
                <select className="input" value={farmForm.region} onChange={updateFarmField('region')}>
                  <option value="">Select region</option>
                  {SRI_LANKA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Total area</label>
                <div className="flex gap-2">
                  <input type="number" className="input flex-1" value={farmForm.total_area} onChange={updateFarmField('total_area')} min="0" step="0.01" />
                  <select className="input w-32" value={farmForm.area_unit} onChange={updateFarmField('area_unit')}>
                    {['perches', 'acres', 'hectares', 'sqm'].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Soil type</label>
                <select className="input" value={farmForm.soil_type} onChange={updateFarmField('soil_type')}>
                  {SOIL_TYPES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Farming type</label>
                <select className="input" value={farmForm.farming_type} onChange={updateFarmField('farming_type')}>
                  {FARMING_TYPES.map((t) => <option key={t} value={t}>{farmingTypeLabels[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Address</label>
                <input type="text" className="input" value={farmForm.address} onChange={updateFarmField('address')} />
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={farmForm.notes} onChange={updateFarmField('notes')} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={updateFarmMutation.isPending} className="btn-primary">
                {updateFarmMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save changes
              </button>
              <button type="button" onClick={() => setShowFarmEdit(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-earth-100 flex items-center justify-center text-2xl flex-shrink-0">🌾</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{farm.name}</h1>
              <p className="text-gray-500 text-sm flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {farm.region ?? 'Sri Lanka'}
                {farm.total_area ? ` · ${farm.total_area} ${farm.area_unit}` : ''}
              </p>
            </div>
            <button onClick={startFarmEdit} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 min-h-0 flex-shrink-0" title="Edit farm">
              <Pencil className="w-4 h-4" />
            </button>
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
      )}

      {/* Plots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Plots ({plots.length})</h2>
          <button onClick={() => { setShowPlotForm(!showPlotForm); setEditingPlotId(null); setPlotForm(emptyPlotForm); }} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add plot
          </button>
        </div>

        {showPlotForm && (
          <div className="card border-leaf-200 mb-4">
            <h3 className="font-semibold text-gray-900 mb-4">New Plot</h3>
            <PlotForm
              onSubmit={handlePlotCreate}
              isPending={createPlotMutation.isPending}
              onCancel={() => setShowPlotForm(false)}
              submitLabel="Save plot"
              error={createPlotMutation.isError ? ((createPlotMutation.error as Error)?.message ?? 'Failed to create plot.') : undefined}
            />
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
              <div key={plot.id}>
                {editingPlotId === plot.id ? (
                  <div className="card border-leaf-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Edit Plot</h3>
                      <button onClick={() => setEditingPlotId(null)} className="text-gray-400 hover:text-gray-600 min-h-0 p-1"><X className="w-4 h-4" /></button>
                    </div>
                    <PlotForm
                      onSubmit={handlePlotUpdate}
                      isPending={updatePlotMutation.isPending}
                      onCancel={() => setEditingPlotId(null)}
                      submitLabel="Save changes"
                      error={updatePlotMutation.isError ? ((updatePlotMutation.error as Error)?.message ?? 'Failed to update plot.') : undefined}
                    />
                  </div>
                ) : (
                  <div className="card flex items-center justify-between hover:shadow-md transition py-3">
                    <Link to={`/crops?plotId=${plot.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-leaf-50 flex items-center justify-center text-lg flex-shrink-0">🪴</div>
                      <div className="min-w-0">
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
                    </Link>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button
                        onClick={(e) => { e.preventDefault(); startPlotEdit(plot); }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 min-h-0"
                        title="Edit plot"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
