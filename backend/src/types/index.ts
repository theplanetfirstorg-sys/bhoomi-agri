import type { Polygon } from 'geojson';

export type UserRole = 'farmer' | 'admin';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';
export type PlanName = 'trial' | 'home_farmer' | 'small_farmer';
export type CropStatus = 'active' | 'harvested' | 'failed' | 'removed';
export type AlertType = 'watering' | 'fertiliser' | 'pest_watch' | 'harvest' | 'weather' | 'custom';
export type AlertStatus = 'pending' | 'sent' | 'acknowledged' | 'dismissed';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  subscription_status: SubscriptionStatus;
  trial_ends_at: Date | null;
  subscription_ends_at: Date | null;
  email_verified: boolean;
  fcm_token: string | null;
  last_active_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Farm {
  id: string;
  user_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  region: string | null;
  address: string | null;
  total_area: number | null;
  area_unit: string;
  soil_type: string;
  farming_type: string;
  elevation_m: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Plot {
  id: string;
  farm_id: string;
  name: string;
  boundary_geojson: Polygon | null;
  area: number | null;
  area_unit: string;
  orientation: string | null;
  sun_exposure: string | null;
  drainage: string | null;
  irrigation_method: string | null;
  water_source: string | null;
  soil_ph: number | null;
  notes: string | null;
  is_active: boolean;
  sensor_device_id: string | null;
  last_sensor_reading_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Crop {
  id: string;
  plot_id: string;
  crop_type: string;
  variety: string | null;
  planting_date: Date | null;
  expected_harvest_date: Date | null;
  actual_harvest_date: Date | null;
  growing_method: string;
  seed_source: string | null;
  goal: string;
  status: CropStatus;
  quantity_planted: number | null;
  quantity_unit: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CarePlan {
  id: string;
  crop_id: string;
  generated_at: Date;
  model_version: string | null;
  watering_schedule: WateringTask[];
  fertiliser_schedule: FertiliserTask[];
  pest_watch: PestWatchItem[];
  alerts: AlertItem[];
  growth_stages: GrowthStage[];
  created_at: Date;
  updated_at: Date;
}

export interface WateringTask {
  day: number;
  frequency: string;
  amount_liters: number;
  time_of_day: string;
  notes: string;
}

export interface FertiliserTask {
  week: number;
  type: string;
  dose: string;
  method: string;
  notes: string;
}

export interface PestWatchItem {
  pest_or_disease: string;
  risk_period: string;
  symptoms: string;
  prevention: string;
  treatment: string;
}

export interface AlertItem {
  trigger: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  due_days_from_planting: number;
}

export interface GrowthStage {
  name: string;
  start_day: number;
  end_day: number;
  description: string;
  key_tasks: string[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  type: 'image' | 'pdf';
  url: string;
  filename: string;
}

export interface MarketPrice {
  id: string;
  commodity: string;
  market: string | null;
  price_date: Date;
  avg_price_lkr: number | null;
  min_price_lkr: number | null;
  max_price_lkr: number | null;
  unit: string;
  source: string;
}

// Auth types
export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
