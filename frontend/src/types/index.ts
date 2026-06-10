export type UserRole = 'farmer' | 'admin';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  email_verified: boolean;
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
  created_at: string;
}

export interface Plot {
  id: string;
  farm_id: string;
  name: string;
  boundary_geojson: GeoJSON.Polygon | null;
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
}

export interface Crop {
  id: string;
  plot_id: string;
  crop_type: string;
  variety: string | null;
  planting_date: string | null;
  expected_harvest_date: string | null;
  growing_method: string;
  goal: string;
  status: 'active' | 'harvested' | 'failed' | 'removed';
  notes: string | null;
  plot_name?: string;
  farm_name?: string;
}

export interface CarePlan {
  id: string;
  crop_id: string;
  generated_at: string;
  watering_schedule: WateringTask[];
  fertiliser_schedule: FertiliserTask[];
  pest_watch: PestWatchItem[];
  alerts: AlertItem[];
  growth_stages: GrowthStage[];
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

export interface Conversation {
  id: string;
  title: string | null;
  farm_id: string | null;
  crop_id: string | null;
  messages: ConversationMessage[];
  ai_query_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: Array<{ type: 'image' | 'pdf'; url: string; filename: string }>;
}

export interface MarketPrice {
  id: string;
  commodity: string;
  market: string | null;
  price_date: string;
  avg_price_lkr: number | null;
  min_price_lkr: number | null;
  max_price_lkr: number | null;
  unit: string;
}
