-- ============================================
-- Flight Price Predictor — Database Schema
-- ============================================

-- Tracked routes: routes the user wants to monitor
CREATE TABLE IF NOT EXISTS tracked_routes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin        VARCHAR(3) NOT NULL,          -- IATA code e.g. LHR
  destination   VARCHAR(3) NOT NULL,          -- IATA code e.g. JFK
  departure_date DATE NOT NULL,
  return_date   DATE,                         -- NULL for one-way
  cabin_class   VARCHAR(20) DEFAULT 'ECONOMY', -- ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
  airline_filter VARCHAR(2),                  -- IATA airline code filter (optional)
  adults        INTEGER DEFAULT 1,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Price snapshots: daily price captures for tracked routes
CREATE TABLE IF NOT EXISTS price_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_route_id UUID NOT NULL REFERENCES tracked_routes(id) ON DELETE CASCADE,
  observed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- when we captured this price
  min_price       DECIMAL(10,2) NOT NULL,
  max_price       DECIMAL(10,2),
  avg_price       DECIMAL(10,2),
  currency        VARCHAR(3) DEFAULT 'GBP',
  carrier_code    VARCHAR(2),                          -- airline IATA code
  carrier_name    VARCHAR(100),
  flight_number   VARCHAR(10),
  departure_time  TIME,
  arrival_time    TIME,
  stops           INTEGER DEFAULT 0,
  duration        VARCHAR(20),                         -- e.g. 'PT8H30M'
  booking_class   VARCHAR(5),
  seats_remaining INTEGER,
  raw_response    JSONB,                               -- full Amadeus response for debugging
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Price alerts: user-defined price thresholds
CREATE TABLE IF NOT EXISTS price_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_route_id UUID NOT NULL REFERENCES tracked_routes(id) ON DELETE CASCADE,
  target_price    DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(3) DEFAULT 'GBP',
  is_triggered    BOOLEAN DEFAULT false,
  triggered_at    TIMESTAMPTZ,
  notification_method VARCHAR(20) DEFAULT 'email',     -- email, push, sms
  contact_info    VARCHAR(255),                        -- email or phone
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- AI predictions: stored predictions from Claude
CREATE TABLE IF NOT EXISTS predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_route_id UUID NOT NULL REFERENCES tracked_routes(id) ON DELETE CASCADE,
  predicted_best_date DATE,
  predicted_price DECIMAL(10,2),
  confidence      DECIMAL(3,2),                        -- 0.00 to 1.00
  recommendation  TEXT,                                -- e.g. "BUY NOW", "WAIT", "PRICE DROPPING"
  reasoning       TEXT,                                -- Claude's explanation
  price_zone      VARCHAR(20),                         -- LOW, MEDIUM, HIGH, PEAK
  factors         JSONB,                               -- contributing factors
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Events: holidays, school breaks, etc. that affect prices
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  event_type  VARCHAR(50) NOT NULL,                    -- HOLIDAY, SCHOOL_BREAK, SPORTING, CONFERENCE, OTHER
  start_date  DATE NOT NULL,
  end_date    DATE,
  country     VARCHAR(2),                              -- ISO country code
  impact      VARCHAR(20) DEFAULT 'MEDIUM',            -- LOW, MEDIUM, HIGH
  description TEXT,
  source      VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_snapshots_route_date ON price_snapshots(tracked_route_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_observed ON price_snapshots(observed_at);
CREATE INDEX IF NOT EXISTS idx_routes_active ON tracked_routes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_routes_departure ON tracked_routes(departure_date);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON price_alerts(is_triggered) WHERE is_triggered = false;
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_predictions_route ON predictions(tracked_route_id, created_at);
