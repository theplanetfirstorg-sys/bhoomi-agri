import api from './client';
import { Crop, CarePlan } from '../types';

export const cropsApi = {
  listAll: () => api.get<{ crops: Crop[] }>('/crops').then((r) => r.data.crops),
  listByPlot: (plotId: string) =>
    api.get<{ crops: Crop[] }>(`/crops/plots/${plotId}`).then((r) => r.data.crops),
  get: (id: string) => api.get<{ crop: Crop }>(`/crops/${id}`).then((r) => r.data.crop),
  create: (plotId: string, data: Partial<Crop>) =>
    api.post<{ crop: Crop }>(`/crops/plots/${plotId}`, data).then((r) => r.data.crop),
  update: (cropId: string, data: Partial<Crop>) =>
    api.put<{ crop: Crop }>(`/crops/${cropId}`, data).then((r) => r.data.crop),
  generateCarePlan: (cropId: string) =>
    api.post<{ plan: CarePlan }>(`/crops/${cropId}/care-plan`).then((r) => r.data.plan),
  getCarePlan: (cropId: string) =>
    api.get<{ plan: CarePlan }>(`/crops/${cropId}/care-plan`).then((r) => r.data.plan),
  logYield: (cropId: string, data: {
    harvest_date: string;
    actual_yield_kg?: number;
    quality_rating?: number;
    issues_faced?: string;
  }) => api.post(`/crops/${cropId}/yield`, data),
};
