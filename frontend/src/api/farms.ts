import api from './client';
import { Farm, Plot } from '../types';

export const farmsApi = {
  list: () => api.get<{ farms: Farm[] }>('/farms').then((r) => r.data.farms),
  get: (id: string) => api.get<{ farm: Farm }>(`/farms/${id}`).then((r) => r.data.farm),
  create: (data: Partial<Farm>) => api.post<{ farm: Farm }>('/farms', data).then((r) => r.data.farm),
  update: (id: string, data: Partial<Farm>) => api.put<{ farm: Farm }>(`/farms/${id}`, data).then((r) => r.data.farm),
  delete: (id: string) => api.delete(`/farms/${id}`),

  getPlots: (farmId: string) =>
    api.get<{ plots: Plot[] }>(`/farms/${farmId}/plots`).then((r) => r.data.plots),
  createPlot: (farmId: string, data: Partial<Plot>) =>
    api.post<{ plot: Plot }>(`/farms/${farmId}/plots`, data).then((r) => r.data.plot),
  updatePlot: (plotId: string, data: Partial<Plot>) =>
    api.put<{ plot: Plot }>(`/farms/plots/${plotId}`, data).then((r) => r.data.plot),
};
