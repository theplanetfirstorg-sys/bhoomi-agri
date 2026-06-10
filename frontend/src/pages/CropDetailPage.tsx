import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles, Droplets, FlaskConical, Bug, Bell, TrendingUp, MessageCircle } from 'lucide-react';
import { cropsApi } from '../api/crops';
import { differenceInDays, format } from 'date-fns';

export default function CropDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: crop, isLoading: cropLoading } = useQuery({
    queryKey: ['crop', id],
    queryFn: () => cropsApi.get(id!),
    enabled: !!id,
  });

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['care-plan', id],
    queryFn: () => cropsApi.getCarePlan(id!),
    enabled: !!id,
    retry: false,
  });

  const generatePlan = useMutation({
    mutationFn: () => cropsApi.generateCarePlan(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['care-plan', id] }),
  });

  if (cropLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-leaf-500" /></div>;
  if (!crop) return <div className="card text-center py-12 text-gray-500">Crop not found.</div>;

  const plantDate = crop.planting_date ? new Date(crop.planting_date) : null;
  const harvestDate = crop.expected_harvest_date ? new Date(crop.expected_harvest_date) : null;
  const daysSincePlanting = plantDate ? differenceInDays(new Date(), plantDate) : null;
  const daysToHarvest = harvestDate ? differenceInDays(harvestDate, new Date()) : null;

  // Find current growth stage
  const currentStage = plan?.growth_stages.find(
    (s) => daysSincePlanting !== null && daysSincePlanting >= s.start_day && daysSincePlanting <= s.end_day
  );

  return (
    <div className="space-y-5">
      {/* Crop header */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-leaf-50 flex items-center justify-center text-3xl">🌿</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{crop.crop_type}</h1>
              {crop.variety && <p className="text-gray-500 text-sm">{crop.variety}</p>}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                  crop.status === 'active' ? 'bg-leaf-100 text-leaf-700' : 'bg-gray-100 text-gray-500'
                }`}>{crop.status}</span>
                <span className="text-xs text-gray-400">{crop.goal.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
          <Link to={`/advisor?cropId=${crop.id}`} className="btn-secondary text-xs py-1.5 px-3 min-h-0">
            <MessageCircle className="w-3.5 h-3.5" /> Ask Bhoomi
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          {plantDate && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">Planted</p>
              <p className="font-medium">{format(plantDate, 'MMM d, yyyy')}</p>
              <p className="text-xs text-gray-400">{daysSincePlanting} days ago</p>
            </div>
          )}
          {harvestDate && (
            <div className={`rounded-xl p-3 ${daysToHarvest !== null && daysToHarvest <= 7 ? 'bg-amber-50' : 'bg-gray-50'}`}>
              <p className="text-xs text-gray-500 mb-0.5">Harvest</p>
              <p className="font-medium">{format(harvestDate, 'MMM d, yyyy')}</p>
              <p className={`text-xs ${daysToHarvest !== null && daysToHarvest <= 7 ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                {daysToHarvest !== null ? (daysToHarvest <= 0 ? '🎉 Ready!' : `${daysToHarvest} days left`) : ''}
              </p>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Method</p>
            <p className="font-medium capitalize">{crop.growing_method.replace('_', ' ')}</p>
          </div>
          {currentStage && (
            <div className="bg-leaf-50 rounded-xl p-3">
              <p className="text-xs text-leaf-600 mb-0.5">Current stage</p>
              <p className="font-medium text-leaf-700 capitalize">{currentStage.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Care Plan */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">AI Care Plan</h2>
          {!plan && !planLoading && (
            <button
              onClick={() => generatePlan.mutate()}
              disabled={generatePlan.isPending}
              className="btn-primary text-sm"
            >
              {generatePlan.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate plan</>
              )}
            </button>
          )}
        </div>

        {planLoading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-leaf-500" /></div>}

        {!plan && !planLoading && !generatePlan.isPending && (
          <div className="card text-center py-8 border-dashed border-2 border-gray-200">
            <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No care plan yet. Generate an AI-powered plan tailored to this crop.</p>
          </div>
        )}

        {generatePlan.isPending && (
          <div className="card text-center py-10">
            <div className="animate-pulse space-y-3">
              <div className="w-12 h-12 rounded-full bg-leaf-100 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-leaf-500" />
              </div>
              <p className="text-gray-600 font-medium">Bhoomi is creating your care plan...</p>
              <p className="text-gray-400 text-sm">Analysing crop type, soil, climate, and Sri Lankan conditions.</p>
            </div>
          </div>
        )}

        {plan && (
          <div className="space-y-4">
            {/* Growth stages */}
            {plan.growth_stages.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-leaf-500" /> Growth Stages
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {plan.growth_stages.map((stage, i) => (
                    <div key={i} className={`flex-shrink-0 rounded-xl px-4 py-3 min-w-[140px] ${
                      currentStage?.name === stage.name ? 'bg-leaf-100 border border-leaf-300' : 'bg-gray-50'
                    }`}>
                      <p className="font-medium text-sm capitalize">{stage.name}</p>
                      <p className="text-xs text-gray-500">Day {stage.start_day}–{stage.end_day}</p>
                      {currentStage?.name === stage.name && (
                        <span className="text-xs text-leaf-600 font-semibold">← You are here</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Watering schedule */}
            {plan.watering_schedule.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-500" /> Watering Schedule
                </h3>
                <div className="space-y-2">
                  {plan.watering_schedule.slice(0, 4).map((task, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="bg-blue-50 text-blue-700 rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                        Day {task.day}
                      </span>
                      <div>
                        <span className="font-medium">{task.frequency}</span>
                        {task.amount_liters > 0 && <span className="text-gray-500"> · {task.amount_liters}L · {task.time_of_day}</span>}
                        {task.notes && <p className="text-gray-500 text-xs mt-0.5">{task.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fertiliser */}
            {plan.fertiliser_schedule.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-500" /> Fertiliser Schedule
                </h3>
                <div className="space-y-2">
                  {plan.fertiliser_schedule.map((task, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="bg-amber-50 text-amber-700 rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                        Week {task.week}
                      </span>
                      <div>
                        <span className="font-medium">{task.type}</span>
                        <span className="text-gray-500"> · {task.dose} · {task.method}</span>
                        {task.notes && <p className="text-gray-500 text-xs mt-0.5">{task.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pest watch */}
            {plan.pest_watch.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                  <Bug className="w-4 h-4 text-red-500" /> Pest & Disease Watch
                </h3>
                <div className="space-y-3">
                  {plan.pest_watch.map((item, i) => (
                    <div key={i} className="bg-red-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-red-800">{item.pest_or_disease}</span>
                        <span className="text-xs text-red-600">{item.risk_period}</span>
                      </div>
                      <p className="text-xs text-red-700 mb-1"><strong>Symptoms:</strong> {item.symptoms}</p>
                      <p className="text-xs text-gray-600"><strong>Treatment:</strong> {item.treatment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alerts */}
            {plan.alerts.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-500" /> Alerts
                </h3>
                <div className="space-y-2">
                  {plan.alerts.map((alert, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
                      alert.severity === 'critical' ? 'bg-red-50 text-red-800'
                      : alert.severity === 'warning' ? 'bg-amber-50 text-amber-800'
                      : 'bg-blue-50 text-blue-800'
                    }`}>
                      <Bell className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{alert.trigger}</p>
                        <p className="text-xs mt-0.5 opacity-80">{alert.message} · Day {alert.due_days_from_planting}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
