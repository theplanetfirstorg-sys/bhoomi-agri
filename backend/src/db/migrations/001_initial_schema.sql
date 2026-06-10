-- Enable PostGIS for geographic data and TimescaleDB for IoT time-series
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('farmer', 'admin');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expired', 'cancelled');

CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  name             TEXT NOT NULL,
  phone            TEXT,
  role             user_role NOT NULL DEFAULT 'farmer',
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at    TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  email_verify_token TEXT,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  fcm_token        TEXT,
  last_active_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);

-- ─────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────
CREATE TYPE plan_name AS ENUM ('trial', 'home_farmer', 'small_farmer');

CREATE TABLE subscription_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            plan_name NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  price_lkr       NUMERIC(10,2) NOT NULL,
  max_farms       INT NOT NULL,
  max_plots       INT NOT NULL,
  max_ai_queries  INT,           -- NULL = unlimited
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscription_plans (name, display_name, price_lkr, max_farms, max_plots, max_ai_queries)
VALUES
  ('trial',        'Free Trial',     0,     1,  3,  20),
  ('home_farmer',  'Home Farmer',    0,     1,  5,  NULL),
  ('small_farmer', 'Small Farmer',   0,     3,  20, NULL);

CREATE TABLE subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan              plan_name NOT NULL,
  status            subscription_status NOT NULL,
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ,
  payment_reference TEXT,
  amount_lkr        NUMERIC(10,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- ─────────────────────────────────────────
-- FARMS
-- ─────────────────────────────────────────
CREATE TYPE farming_type AS ENUM ('home_garden', 'smallholder', 'commercial', 'organic', 'mixed');
CREATE TYPE soil_type AS ENUM ('clay', 'sandy', 'loamy', 'silt', 'peat', 'chalk', 'unknown');

CREATE TABLE farms (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  location     GEOMETRY(POINT, 4326),   -- lat/lng as PostGIS point
  latitude     NUMERIC(10,7),
  longitude    NUMERIC(10,7),
  region       TEXT,                    -- e.g. "Western Province", "Kandy"
  address      TEXT,
  total_area   NUMERIC(10,3),
  area_unit    TEXT NOT NULL DEFAULT 'perches', -- perches, acres, hectares, sqm
  soil_type    soil_type NOT NULL DEFAULT 'unknown',
  farming_type farming_type NOT NULL DEFAULT 'home_garden',
  elevation_m  NUMERIC(7,2),
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_farms_user_id ON farms(user_id);
CREATE INDEX idx_farms_location ON farms USING GIST(location);

-- ─────────────────────────────────────────
-- PLOTS
-- ─────────────────────────────────────────
CREATE TYPE sun_exposure AS ENUM ('full_sun', 'partial_shade', 'full_shade');
CREATE TYPE drainage_type AS ENUM ('excellent', 'good', 'moderate', 'poor', 'waterlogged');
CREATE TYPE irrigation_method AS ENUM ('drip', 'sprinkler', 'flood', 'manual', 'rainwater', 'none');
CREATE TYPE water_source AS ENUM ('well', 'river', 'municipal', 'rainwater', 'tank', 'stream');

CREATE TABLE plots (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id               UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  boundary_geojson      JSONB,           -- GeoJSON polygon for map display
  area                  NUMERIC(10,3),
  area_unit             TEXT NOT NULL DEFAULT 'perches',
  orientation           TEXT,            -- e.g. "North-South", "East-West"
  sun_exposure          sun_exposure,
  drainage              drainage_type,
  irrigation_method     irrigation_method,
  water_source          water_source,
  soil_ph               NUMERIC(4,2),
  notes                 TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  -- v2-ready IoT fields (nullable in v1)
  sensor_device_id      TEXT,
  last_sensor_reading_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plots_farm_id ON plots(farm_id);

-- ─────────────────────────────────────────
-- CROPS
-- ─────────────────────────────────────────
CREATE TYPE crop_status AS ENUM ('active', 'harvested', 'failed', 'removed');
CREATE TYPE growing_method AS ENUM ('in_ground', 'raised_bed', 'container', 'greenhouse', 'hydroponic', 'vertical');
CREATE TYPE crop_goal AS ENUM ('home_consumption', 'sell_local', 'export');
CREATE TYPE seed_source AS ENUM ('own_saved', 'local_market', 'government', 'certified', 'imported');

CREATE TABLE crops (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id               UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  crop_type             TEXT NOT NULL,   -- e.g. "Tomato", "Coconut", "Rice"
  variety               TEXT,
  planting_date         DATE,
  expected_harvest_date DATE,
  actual_harvest_date   DATE,
  growing_method        growing_method NOT NULL DEFAULT 'in_ground',
  seed_source           seed_source,
  goal                  crop_goal NOT NULL DEFAULT 'home_consumption',
  status                crop_status NOT NULL DEFAULT 'active',
  quantity_planted      NUMERIC(10,2),
  quantity_unit         TEXT,            -- kg, plants, seeds
  soil_ph_at_planting   NUMERIC(4,2),
  fertiliser_used       TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crops_plot_id ON crops(plot_id);
CREATE INDEX idx_crops_status ON crops(status);

-- ─────────────────────────────────────────
-- CARE PLANS
-- ─────────────────────────────────────────
CREATE TABLE care_plans (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_id              UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  generated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version        TEXT,             -- Claude model used
  watering_schedule    JSONB NOT NULL DEFAULT '[]',
  fertiliser_schedule  JSONB NOT NULL DEFAULT '[]',
  pest_watch           JSONB NOT NULL DEFAULT '[]',
  alerts               JSONB NOT NULL DEFAULT '[]',
  growth_stages        JSONB NOT NULL DEFAULT '[]',
  raw_ai_response      TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_care_plans_crop_id ON care_plans(crop_id);

-- ─────────────────────────────────────────
-- CONVERSATIONS (AI Advisor)
-- ─────────────────────────────────────────
CREATE TABLE conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farm_id    UUID REFERENCES farms(id) ON DELETE SET NULL,
  crop_id    UUID REFERENCES crops(id) ON DELETE SET NULL,
  title      TEXT,
  messages   JSONB NOT NULL DEFAULT '[]',
  ai_query_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);

-- ─────────────────────────────────────────
-- YIELD OUTCOMES
-- ─────────────────────────────────────────
CREATE TYPE yield_comparison AS ENUM ('under', 'on_target', 'over');

CREATE TABLE yield_outcomes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_id             UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  harvest_date        DATE NOT NULL,
  actual_yield_kg     NUMERIC(10,3),
  yield_per_sqm       NUMERIC(10,3),
  quality_rating      SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
  issues_faced        TEXT,
  photo_url           TEXT,
  comparison_result   yield_comparison,
  lessons_extracted   JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_yield_outcomes_crop_id ON yield_outcomes(crop_id);

-- ─────────────────────────────────────────
-- MARKET PRICES (CBSL data)
-- ─────────────────────────────────────────
CREATE TABLE market_prices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commodity     TEXT NOT NULL,
  market        TEXT,                -- e.g. "Colombo", "Kandy", "National Average"
  price_date    DATE NOT NULL,
  avg_price_lkr NUMERIC(10,2),
  min_price_lkr NUMERIC(10,2),
  max_price_lkr NUMERIC(10,2),
  unit          TEXT NOT NULL DEFAULT 'kg',
  source        TEXT NOT NULL DEFAULT 'CBSL',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_prices_commodity ON market_prices(commodity);
CREATE INDEX idx_market_prices_date ON market_prices(price_date DESC);
CREATE UNIQUE INDEX idx_market_prices_unique ON market_prices(commodity, market, price_date);

-- ─────────────────────────────────────────
-- SOIL REPORTS
-- ─────────────────────────────────────────
CREATE TABLE soil_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id         UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url        TEXT NOT NULL,
  file_type       TEXT,               -- pdf, image
  report_date     DATE,
  extracted_data  JSONB,              -- AI-extracted nutrient values
  ai_analysis     TEXT,               -- AI interpretation text
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_soil_reports_plot_id ON soil_reports(plot_id);

-- ─────────────────────────────────────────
-- ALERTS
-- ─────────────────────────────────────────
CREATE TYPE alert_type AS ENUM ('watering', 'fertiliser', 'pest_watch', 'harvest', 'weather', 'custom');
CREATE TYPE alert_status AS ENUM ('pending', 'sent', 'acknowledged', 'dismissed');

CREATE TABLE alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crop_id     UUID REFERENCES crops(id) ON DELETE CASCADE,
  plot_id     UUID REFERENCES plots(id) ON DELETE CASCADE,
  type        alert_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  due_at      TIMESTAMPTZ NOT NULL,
  status      alert_status NOT NULL DEFAULT 'pending',
  sent_at     TIMESTAMPTZ,
  ack_at      TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_due_at ON alerts(due_at);
CREATE INDEX idx_alerts_status ON alerts(status);

-- ─────────────────────────────────────────
-- IOT — v2-READY (schema present, not used in v1)
-- ─────────────────────────────────────────
CREATE TYPE sensor_type AS ENUM (
  'soil_moisture', 'soil_temperature', 'soil_ph', 'soil_ec',
  'air_temperature', 'air_humidity', 'light_intensity',
  'rainfall', 'wind_speed', 'co2_level'
);

CREATE TABLE sensor_devices (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id      UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  device_id    TEXT NOT NULL UNIQUE,
  device_type  TEXT,
  protocol     TEXT DEFAULT 'mqtt',    -- mqtt | http
  firmware_version TEXT,
  last_seen_at TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sensor_readings (
  id          UUID NOT NULL DEFAULT uuid_generate_v4(),
  plot_id     UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  device_id   TEXT NOT NULL,
  sensor_type sensor_type NOT NULL,
  value       NUMERIC(12,4) NOT NULL,
  unit        TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, recorded_at)
);

-- TimescaleDB hypertable (will activate when TimescaleDB extension is available)
-- SELECT create_hypertable('sensor_readings', 'recorded_at');

CREATE INDEX idx_sensor_readings_plot_id ON sensor_readings(plot_id, recorded_at DESC);
CREATE INDEX idx_sensor_readings_device ON sensor_readings(device_id, recorded_at DESC);

CREATE TABLE alert_thresholds (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id      UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  crop_id      UUID REFERENCES crops(id) ON DELETE CASCADE,
  sensor_type  sensor_type NOT NULL,
  min_value    NUMERIC(12,4),
  max_value    NUMERIC(12,4),
  is_active    BOOLEAN NOT NULL DEFAULT FALSE,  -- inactive in v1
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- ADMIN AUDIT LOG
-- ─────────────────────────────────────────
CREATE TABLE admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  target_type TEXT,               -- 'user', 'subscription', etc.
  target_id   UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_created_at ON admin_audit_log(created_at DESC);

-- ─────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','subscriptions','subscription_plans','farms','plots',
    'crops','care_plans','conversations','yield_outcomes',
    'sensor_devices','alert_thresholds'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;
