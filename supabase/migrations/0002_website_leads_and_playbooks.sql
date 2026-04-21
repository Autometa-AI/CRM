-- ============================================================
-- 0002 — Ingestion tables for the public website
--
-- Adds three sources that flow in from autometa-ai.com:
--   1. raw_website_leads      — inbound form submissions
--   2. raw_discovery_calls    — Cal.com booking webhooks
--   3. playbook_logins        — phone-OTP sign-ins to /resources
--
-- Plus one view that rolls up playbook logins per unique phone.
-- ============================================================

-- ---------- 1. raw_website_leads ----------
CREATE TABLE IF NOT EXISTS raw_website_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_website TEXT,
  message TEXT,
  source_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  user_agent TEXT,
  ip_address TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  raw_payload JSONB,
  matched_master_id UUID REFERENCES master_companies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wl_submitted  ON raw_website_leads(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_wl_email      ON raw_website_leads(email);
CREATE INDEX IF NOT EXISTS idx_wl_phone      ON raw_website_leads(phone);


-- ---------- 2. raw_discovery_calls (Cal.com) ----------
DO $$ BEGIN
  CREATE TYPE discovery_call_status AS ENUM (
    'accepted','pending','cancelled','rescheduled','completed','no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS raw_discovery_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT UNIQUE,            -- Cal.com booking uid for idempotency
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  additional_notes TEXT,
  event_name TEXT,
  event_type_slug TEXT,
  event_duration_minutes INT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  attendee_timezone TEXT,
  meeting_location TEXT,
  status discovery_call_status DEFAULT 'accepted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  raw_payload JSONB,
  matched_master_id UUID REFERENCES master_companies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dc_scheduled  ON raw_discovery_calls(scheduled_start DESC);
CREATE INDEX IF NOT EXISTS idx_dc_email      ON raw_discovery_calls(email);
CREATE INDEX IF NOT EXISTS idx_dc_status     ON raw_discovery_calls(status);


-- ---------- 3. playbook_logins ----------
--
-- Every time someone completes phone-OTP sign-in at /resources/login.
-- The combination (country_code, phone_number) is NOT unique here —
-- we keep one row per sign-in event so we can show history per phone.
--
-- For the "unique phones" list the view below does the aggregation.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS playbook_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,           -- e.g. '+971'
  phone_number TEXT NOT NULL,           -- national number as entered
  full_phone TEXT GENERATED ALWAYS AS (country_code || ' ' || phone_number) STORED,
  otp_verified BOOLEAN DEFAULT TRUE,    -- set false on failed verifies you still want logged
  source_page TEXT,                     -- '/resources/login'
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  logged_in_at TIMESTAMPTZ DEFAULT NOW(),
  raw_payload JSONB,
  matched_master_id UUID REFERENCES master_companies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pl_logged_at   ON playbook_logins(logged_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_pl_full_phone  ON playbook_logins(full_phone);
CREATE INDEX IF NOT EXISTS idx_pl_cc_phone    ON playbook_logins(country_code, phone_number);


-- ---------- 4. View: playbook_logins_by_phone ----------
--
-- One row per unique phone, with:
--   - total + verified sign-in counts
--   - first + last seen timestamps
--   - latest user_agent and source_page
--
-- Used by the CRM's Tables index. Clicking a row navigates to the
-- per-phone history view (rendered from the raw playbook_logins table).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW playbook_logins_by_phone AS
SELECT
  full_phone                                         AS id,        -- pk for the list page
  country_code,
  phone_number,
  full_phone,
  COUNT(*)                                           AS total_logins,
  COUNT(*) FILTER (WHERE otp_verified)               AS verified_logins,
  MIN(logged_in_at)                                  AS first_seen_at,
  MAX(logged_in_at)                                  AS last_seen_at,
  (ARRAY_AGG(source_page ORDER BY logged_in_at DESC))[1]  AS latest_source_page,
  (ARRAY_AGG(user_agent  ORDER BY logged_in_at DESC))[1]  AS latest_user_agent,
  (ARRAY_AGG(ip_address  ORDER BY logged_in_at DESC))[1]  AS latest_ip
FROM playbook_logins
GROUP BY full_phone, country_code, phone_number
ORDER BY last_seen_at DESC;
