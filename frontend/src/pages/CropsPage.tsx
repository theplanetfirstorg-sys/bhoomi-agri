import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Sprout, ChevronRight, Loader2, Calendar, Pencil, X } from 'lucide-react';
import { cropsApi } from '../api/crops';
import { farmsApi } from '../api/farms';
import { Crop } from '../types';
import { differenceInDays, format } from 'date-fns';

const GROWING_METHODS = ['in_ground', 'raised_bed', 'container', 'greenhouse', 'hydroponic', 'vertical'];
const GOALS = ['home_consumption', 'sell_local', 'export'];
const SEED_SOURCES = ['own_saved', 'local_market', 'government', 'certified', 'imported'];
const GOAL_LABELS: Record<string, string> = {
  home_consumption: 'Home use', sell_local: 'Sell locally', export: 'Export',
};

const emptyForm = {
  crop_type: '', variety: '', planting_date: '', expected_harvest_date: '',
  growing_method: 'in_ground', goal: 'home_consumption', seed_source: 'local_market', notes: '',
};

function cropToForm(crop: Crop) {
  return {
    crop_type: crop.crop_type ?? '',
    variety: crop.variety ?? '',
    planting_date: crop.planting_date ? crop.planting_date.slice(0, 10) : '',
    expected_harvest_date: crop.expected_harvest_date ? crop.expected_harvest_date.slice(0, 10) : '',
    growing_method: crop.growing_method ?? 'in_ground',
    goal: crop.goal ?? 'home_consumption',
    seed_source: crop.seed_source ?? 'local_market',
    notes: crop.notes ?? '',
  };
}

export default function CropsPage() {
  const [searchParams] = useSearchParams();
  const filterPlotId = searchParams.get('plotId');
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPlotId, setSelectedPlotId] = useState(filterPlotId ?? '');
  const [form, setForm] = useState(emptyForm);
  const [plotsByFarm, setPlotsbyFarm] = useState<Record<string, Array<{ id: string; name: string }>>>({});

  const { data: crops = [], isLoading } = useQuery({ queryKey: ['crops'], queryFn: cropsApi.listAll });
  const { data: farms = [] } = useQuery({ queryKey: ['farms'], queryFn: farmsApi.list });

  async function loadPlots(farmId: string) {
    if (plotsByFarm[farmId]) return;
    const plots = await farmsApi.getPlots(farmId);
    setPlotsbyFarm((p) => ({ ...p, [farmId]: plots }));
  }

  const createMutation = useMutation({
    mutationFn: () => cropsApi.create(selectedPlotId, form as Partial<Crop>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crops'] });
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Crop> }) => cropsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crops'] });
      setEditingId(null);
    },
  });

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function startEdit(crop: Crop) {
    setEditingId(crop.id);
    setForm(cropToForm(crop));
    setShowForm(false);
  }

  const filteredCrops = filterPlotId ? crops.filter((c) => c.plot_id === filterPlotId) : crops;
  const allPlots = Object.values(plotsByFarm).flat();

  function CropFormFields() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Crop type *</label>
          <input type="text" className="input" placeholder="Tomato, Rice, Coconut..." value={form.crop_type} onChange={update('crop_type')} required />
        </div>
        <div>
          <label className="label">Variety</label>
          <input type="text" className="input" placeholder="e.g. Roma, T1, local" value={form.variety} onChange={update('variety')} />
        </div>
        <div>
          <label className="label">Planting date</label>
          <input type="date" className="input" value={form.planting_date} onChange={update('planting_date')} />
        </div>
        <div>
          <label className="label">Expected harvest</label>
          <input type="date" className="input" value={form.expected_harvest_date} onChange={update('expected_harvest_date')} />
        </div>
        <div>
          <label className="label">Growing method</label>
          <select className="input" value={form.growing_method} onChange={update('growing_method')}>
            {GROWING_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Seed source</label>
          <select className="input" value={form.seed_source} onChange={update('seed_source')}>
            {SEED_SOURCES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Goal</label>
          <select className="input" value={form.goal} onChange={update('goal')}>
            {GOALS.map((g) => <option key={g} value={g}>{GOAL_LABELS[g]}</option>)}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Crops</h1>
        <button
          onClick={async () => {
            setShowForm(!showForm);
            setEditingId(null);
            setForm(emptyForm);
            if (farms.length > 0) await loadPlots(farms[0].id);
          }}
          className="btn-primary text-sm"
        >
          <Plus className="w-4 h-4" /> Add crop
        </button>
      </div>

      {showForm && (
        <div className="card border-leaf-200">
          <h2 className="font-semibold text-gray-900 mb-4">Add Crop</h2>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Farm *</label>
                <select className="input" onChange={async (e) => { await loadPlots(e.target.value); setSelectedPlotId(''); }} defaultValue="">
                  <option value="" disabled>Select farm</option>
                  {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Plot *</label>
                <select className="input" value={selectedPlotId} onChange={(e) => setSelectedPlotId(e.target.value)} required>
                  <option value="" disabled>Select plot</option>
                  {allPlots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <CropFormFields />
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={update('notes')} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending || !selectedPlotId} className="btn-primary">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save crop
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-leaf-500" /></div>
      ) : filteredCrops.length === 0 ? (
        <div className="card text-center py-12">
          <Sprout className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No crops yet. Add your first crop to get an AI care plan.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCrops.map((crop) => {
            const harvestDate = crop.expected_harvest_date ? new Date(crop.expected_harvest_date) : null;
            const daysLeft = harvestDate ? differenceInDays(harvestDate, new Date()) : null;
            const plantDate = crop.planting_date ? new Date(crop.planting_date) : null;

            return (
              <div key={crop.id}>
                {editingId === crop.id ? (
                  <div className="card border-leaf-200">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-gray-900">Edit Crop</h2>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 min-h-0 p-1"><X className="w-4 h-4" /></button>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ id: crop.id, data: form as Partial<Crop> }); }} className="space-y-4">
                      <CropFormFields />
                      <div>
                        <label className="label">Notes</label>
                        <textarea className="input" rows={2} value={form.notes} onChange={update('notes')} />
                      </div>
                      {updateMutation.isError && (
                        <p className="text-sm text-red-600">{(updateMutation.error as Error)?.message ?? 'Failed to update crop.'}</p>
                      )}
                      <div className="flex gap-3">
                        <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Save changes
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="btn-secondary">Cancel</button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="card flex items-center justify-between hover:shadow-md transition py-3">
                    <Link to={`/crops/${crop.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-leaf-50 flex items-center justify-center text-xl flex-shrink-0">🌿</div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{crop.crop_type}{crop.variety ? ` · ${crop.variety}` : ''}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {crop.farm_name} · {crop.plot_name}
                          {plantDate ? ` · planted ${format(plantDate, 'MMM d')}` : ''}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {daysLeft !== null && (
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 flex items-center gap-1 ${
                          daysLeft <= 0 ? 'bg-amber-100 text-amber-700'
                          : daysLeft <= 14 ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {daysLeft <= 0 ? 'Harvest!' : `${daysLeft}d`}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); startEdit(crop); }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 min-h-0"
                        title="Edit crop"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
