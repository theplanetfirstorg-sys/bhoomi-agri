import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, ChevronRight, Loader2, Pencil, X } from 'lucide-react';
import { farmsApi } from '../api/farms';
import { Farm } from '../types';

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

const emptyForm = {
  name: '', region: '', address: '', total_area: '', area_unit: 'perches',
  soil_type: 'unknown', farming_type: 'home_garden', notes: '',
};

function farmToForm(farm: Farm) {
  return {
    name: farm.name ?? '',
    region: farm.region ?? '',
    address: farm.address ?? '',
    total_area: farm.total_area != null ? String(farm.total_area) : '',
    area_unit: farm.area_unit ?? 'perches',
    soil_type: farm.soil_type ?? 'unknown',
    farming_type: farm.farming_type ?? 'home_garden',
    notes: farm.notes ?? '',
  };
}

export default function FarmsPage() {
  const qc = useQueryClient();
  const { data: farms = [], isLoading } = useQuery({ queryKey: ['farms'], queryFn: farmsApi.list });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Farm>) => farmsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farms'] });
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Farm> }) => farmsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farms'] });
      setEditingId(null);
    },
  });

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      total_area: form.total_area ? parseFloat(form.total_area) : undefined,
    } as Partial<Farm>);
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      data: { ...form, total_area: form.total_area ? parseFloat(form.total_area) : undefined } as Partial<Farm>,
    });
  }

  function startEdit(farm: Farm) {
    setEditingId(farm.id);
    setForm(farmToForm(farm));
    setShowForm(false);
  }

  function FarmForm({ onSubmit, isPending, onCancel, submitLabel }: {
    onSubmit: (e: React.FormEvent) => void;
    isPending: boolean;
    onCancel: () => void;
    submitLabel: string;
  }) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Farm name *</label>
            <input type="text" className="input" placeholder="My Kandy Farm" value={form.name} onChange={update('name')} required />
          </div>
          <div>
            <label className="label">Region</label>
            <select className="input" value={form.region} onChange={update('region')}>
              <option value="">Select region</option>
              {SRI_LANKA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Total area</label>
            <div className="flex gap-2">
              <input type="number" className="input flex-1" placeholder="20" value={form.total_area} onChange={update('total_area')} min="0" step="0.01" />
              <select className="input w-32" value={form.area_unit} onChange={update('area_unit')}>
                {['perches', 'acres', 'hectares', 'sqm'].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Soil type</label>
            <select className="input" value={form.soil_type} onChange={update('soil_type')}>
              {SOIL_TYPES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Farming type</label>
            <select className="input" value={form.farming_type} onChange={update('farming_type')}>
              {FARMING_TYPES.map((t) => <option key={t} value={t}>{farmingTypeLabels[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Address</label>
            <input type="text" className="input" placeholder="Kandy, Central Province" value={form.address} onChange={update('address')} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} placeholder="Any additional details..." value={form.notes} onChange={update('notes')} />
        </div>
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Farms</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Add farm
        </button>
      </div>

      {showForm && (
        <div className="card border-leaf-200">
          <h2 className="font-semibold text-gray-900 mb-4">New Farm</h2>
          <FarmForm onSubmit={handleCreate} isPending={createMutation.isPending} onCancel={() => setShowForm(false)} submitLabel="Save farm" />
          {createMutation.isError && (
            <p className="text-sm text-red-600 mt-2">{(createMutation.error as Error)?.message ?? 'Failed to create farm.'}</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-leaf-500" /></div>
      ) : farms.length === 0 ? (
        <div className="card text-center py-12">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700 mb-1">No farms yet</h3>
          <p className="text-gray-400 text-sm">Add your first farm to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {farms.map((farm) => (
            <div key={farm.id}>
              {editingId === farm.id ? (
                <div className="card border-leaf-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Edit Farm</h2>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 min-h-0 p-1"><X className="w-4 h-4" /></button>
                  </div>
                  <FarmForm onSubmit={handleUpdate} isPending={updateMutation.isPending} onCancel={() => setEditingId(null)} submitLabel="Save changes" />
                  {updateMutation.isError && (
                    <p className="text-sm text-red-600 mt-2">{(updateMutation.error as Error)?.message ?? 'Failed to update farm.'}</p>
                  )}
                </div>
              ) : (
                <div className="card flex items-center justify-between hover:shadow-md transition">
                  <Link to={`/farms/${farm.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-earth-100 flex items-center justify-center text-xl flex-shrink-0">🌾</div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{farm.name}</p>
                      <p className="text-xs text-gray-500">
                        {farm.region ?? 'Sri Lanka'}
                        {farm.total_area ? ` · ${farm.total_area} ${farm.area_unit}` : ''}
                        {' · '}{farmingTypeLabels[farm.farming_type] ?? farm.farming_type}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={(e) => { e.preventDefault(); startEdit(farm); }}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 min-h-0"
                      title="Edit farm"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
