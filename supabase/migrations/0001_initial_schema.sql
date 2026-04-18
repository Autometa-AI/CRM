-- Autometa CRM — Initial Schema
-- Phases: raw sources → master_companies → enrichment/scoring → outreach/deals → finances

-- =========================================================================
-- EXTENSIONS
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- ENUMS
-- =========================================================================
CREATE TYPE emirate AS ENUM (
  'dubai', 'abu_dhabi', 'sharjah', 'ajman',
  'umm_al_quwain', 'ras_al_khaimah', 'fujairah', 'unknown'
);

CREATE TYPE company_type AS ENUM (
  'broker', 'developer', 'both', 'property_management', 'unknown'
);

CREATE TYPE pipeline_stage AS ENUM (
  'raw', 'enriched', 'outreach', 'replied', 'qualified', 'client'
);

CREATE TYPE enrichment_status AS ENUM (
  'pending', 'in_progress', 'done', 'failed'
);

CREATE TYPE outreach_status AS ENUM (
  'not_started', 'queued', 'sent', 'opened', 'replied',
  'meeting_booked', 'closed_won', 'closed_lost'
);

CREATE TYPE data_source AS ENUM (
  'govt', 'directory', 'paid', 'platform', 'maps', 'manual'
);

CREATE TYPE outreach_channel AS ENUM (
  'email', 'linkedin', 'phone', 'whatsapp'
);

CREATE TYPE expense_category AS ENUM (
  'salary', 'subscription', 'tools', 'marketing', 'office', 'travel', 'other'
);

CREATE TYPE recurrence_type AS ENUM (
  'one_time', 'monthly', 'quarterly', 'yearly'
);

-- =========================================================================
-- HELPERS
-- =========================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- PHASE 2: MASTER COMPANIES (created first since raw tables FK to it)
-- =========================================================================
CREATE TABLE master_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  domain TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  secondary_phone TEXT,
  whatsapp TEXT,
  city emirate DEFAULT 'unknown',
  address TEXT,
  company_type company_type DEFAULT 'unknown',
  license_number TEXT,
  primary_source data_source,
  source_ids JSONB DEFAULT '{}'::jsonb,
  sources_matched INT DEFAULT 1,
  pipeline_stage pipeline_stage DEFAULT 'raw',
  enrichment_status enrichment_status DEFAULT 'pending',
  outreach_status outreach_status DEFAULT 'not_started',
  lead_score INT DEFAULT 0,
  confidence_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_enriched_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_master_pipeline_stage ON master_companies(pipeline_stage);
CREATE INDEX idx_master_lead_score ON master_companies(lead_score DESC);
CREATE INDEX idx_master_enrichment_status ON master_companies(enrichment_status);
CREATE INDEX idx_master_outreach_status ON master_companies(outreach_status);
CREATE INDEX idx_master_city ON master_companies(city);
CREATE INDEX idx_master_company_type ON master_companies(company_type);
CREATE INDEX idx_master_name_phone ON master_companies(company_name, phone);

CREATE TRIGGER trg_master_companies_updated_at
  BEFORE UPDATE ON master_companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- PHASE 1: RAW DATA TABLES
-- =========================================================================
CREATE TABLE raw_govt_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  license_number TEXT UNIQUE,
  license_type TEXT,
  trade_name TEXT,
  legal_form TEXT,
  issue_date DATE,
  expiry_date DATE,
  status TEXT,
  emirate TEXT,
  address TEXT,
  activities TEXT[],
  source_url TEXT,
  source_name TEXT,
  raw_payload JSONB,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  matched_master_id UUID REFERENCES master_companies(id) ON DELETE SET NULL
);

CREATE TABLE raw_directory_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  website TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  category TEXT,
  description TEXT,
  source_directory TEXT,
  source_url TEXT,
  raw_payload JSONB,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  matched_master_id UUID REFERENCES master_companies(id) ON DELETE SET NULL
);

CREATE TABLE raw_paid_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  domain TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  employee_count INT,
  industry TEXT,
  city TEXT,
  country TEXT,
  technologies TEXT[],
  source_provider TEXT,
  raw_payload JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  matched_master_id UUID REFERENCES master_companies(id) ON DELETE SET NULL
);

CREATE TABLE raw_platform_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  platform TEXT,
  profile_url TEXT,
  listing_count INT,
  active_listings INT,
  agent_count INT,
  rating NUMERIC(3,2),
  city TEXT,
  raw_payload JSONB,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  matched_master_id UUID REFERENCES master_companies(id) ON DELETE SET NULL
);

CREATE TABLE raw_maps_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  google_maps_url TEXT,
  place_id TEXT UNIQUE,
  rating NUMERIC(3,2),
  review_count INT,
  business_status TEXT,
  categories TEXT[],
  opening_hours JSONB,
  photos_count INT,
  search_query TEXT,
  raw_payload JSONB,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  matched_master_id UUID REFERENCES master_companies(id) ON DELETE SET NULL
);

-- =========================================================================
-- PHASE 3: ENRICHMENT & SCORING
-- =========================================================================
CREATE TABLE enrichment_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES master_companies(id) ON DELETE CASCADE,
  linkedin_url TEXT,
  linkedin_employee_count INT,
  linkedin_industry TEXT,
  tech_stack TEXT[],
  has_crm BOOLEAN,
  crm_name TEXT,
  has_chatbot BOOLEAN,
  has_live_chat BOOLEAN,
  decision_makers JSONB,
  founded_year INT,
  employee_count_range TEXT,
  annual_revenue_range TEXT,
  property_finder_url TEXT,
  bayut_url TEXT,
  listing_count INT,
  active_listings INT,
  google_rating NUMERIC(3,2),
  google_review_count INT,
  is_hiring BOOLEAN,
  hiring_roles TEXT[],
  enriched_by TEXT,
  enriched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES master_companies(id) ON DELETE CASCADE,
  business_summary TEXT,
  icp_fit_score INT CHECK (icp_fit_score BETWEEN 0 AND 100),
  icp_fit_reasoning TEXT,
  pain_points TEXT[],
  ai_opportunities TEXT[],
  tech_maturity TEXT CHECK (tech_maturity IN ('low', 'medium', 'high')),
  digital_presence_score INT CHECK (digital_presence_score BETWEEN 0 AND 100),
  website_quality TEXT CHECK (website_quality IN ('poor', 'average', 'good', 'excellent')),
  website_issues TEXT[],
  outreach_hooks TEXT[],
  recommended_service TEXT,
  ai_model TEXT,
  prompt_version TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES master_companies(id) ON DELETE CASCADE,
  total_score INT DEFAULT 0,
  score_website INT DEFAULT 0 CHECK (score_website BETWEEN 0 AND 10),
  score_listings INT DEFAULT 0 CHECK (score_listings BETWEEN 0 AND 20),
  score_hiring INT DEFAULT 0 CHECK (score_hiring BETWEEN 0 AND 20),
  score_poor_tech INT DEFAULT 0 CHECK (score_poor_tech BETWEEN 0 AND 30),
  score_reviews INT DEFAULT 0 CHECK (score_reviews BETWEEN 0 AND 20),
  score_icp_fit INT DEFAULT 0,
  score_engagement INT DEFAULT 0,
  scoring_version TEXT DEFAULT 'v1',
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- PHASE 4-5: OUTREACH & DEALS
-- =========================================================================
CREATE TABLE outreach_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES master_companies(id) ON DELETE CASCADE,
  channel outreach_channel NOT NULL,
  action TEXT,
  subject TEXT,
  message_preview TEXT,
  template_used TEXT,
  personalization_fields JSONB,
  was_opened BOOLEAN DEFAULT FALSE,
  was_clicked BOOLEAN DEFAULT FALSE,
  was_replied BOOLEAN DEFAULT FALSE,
  reply_sentiment TEXT CHECK (reply_sentiment IN ('positive', 'neutral', 'negative', 'not_interested')),
  sent_via TEXT,
  external_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  sequence_step INT,
  sequence_name TEXT
);

CREATE INDEX idx_outreach_company ON outreach_log(company_id);
CREATE INDEX idx_outreach_sent_at ON outreach_log(sent_at DESC);

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES master_companies(id) ON DELETE CASCADE,
  deal_name TEXT NOT NULL,
  service_type TEXT CHECK (service_type IN (
    'ai_integration', 'website', 'app_development',
    'server_management', 'lead_funnel', 'agentic_ai'
  )),
  deal_value NUMERIC(12,2),
  currency TEXT DEFAULT 'AED',
  deal_stage TEXT CHECK (deal_stage IN (
    'proposal', 'negotiation', 'contract', 'active', 'completed', 'cancelled'
  )),
  started_at DATE,
  closed_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deals_company ON deals(company_id);

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- FINANCES
-- =========================================================================
CREATE TABLE finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category expense_category NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'AED',
  recipient TEXT,
  date DATE DEFAULT CURRENT_DATE,
  recurrence recurrence_type DEFAULT 'one_time',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_finances_updated_at
  BEFORE UPDATE ON finances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- VIEWS
-- =========================================================================
CREATE OR REPLACE VIEW active_leads AS
SELECT
  mc.*,
  ls.total_score,
  ai.icp_fit_score,
  ai.recommended_service,
  ed.linkedin_employee_count,
  (SELECT COUNT(*) FROM outreach_log ol WHERE ol.company_id = mc.id) AS touchpoint_count,
  (SELECT MAX(sent_at) FROM outreach_log ol WHERE ol.company_id = mc.id) AS last_outreach_at
FROM master_companies mc
LEFT JOIN lead_scores ls ON ls.company_id = mc.id
LEFT JOIN ai_insights ai ON ai.company_id = mc.id
LEFT JOIN enrichment_data ed ON ed.company_id = mc.id
WHERE mc.pipeline_stage IN ('outreach', 'replied')
  AND mc.is_archived = FALSE;

CREATE OR REPLACE VIEW qualified_leads AS
SELECT
  mc.*,
  ls.total_score,
  ai.icp_fit_score,
  ai.recommended_service,
  (
    SELECT reply_sentiment FROM outreach_log ol
    WHERE ol.company_id = mc.id AND ol.was_replied = TRUE
    ORDER BY replied_at DESC LIMIT 1
  ) AS latest_reply_sentiment
FROM master_companies mc
LEFT JOIN lead_scores ls ON ls.company_id = mc.id
LEFT JOIN ai_insights ai ON ai.company_id = mc.id
WHERE mc.pipeline_stage = 'qualified'
  AND mc.is_archived = FALSE;

CREATE OR REPLACE VIEW clients AS
SELECT
  mc.*,
  ai.recommended_service,
  ai.ai_opportunities,
  ed.decision_makers
FROM master_companies mc
LEFT JOIN ai_insights ai ON ai.company_id = mc.id
LEFT JOIN enrichment_data ed ON ed.company_id = mc.id
WHERE mc.pipeline_stage = 'client'
  AND mc.is_archived = FALSE;

CREATE OR REPLACE VIEW pipeline_summary AS
SELECT
  pipeline_stage,
  city,
  company_type,
  COUNT(*) AS company_count,
  AVG(lead_score)::NUMERIC(6,2) AS avg_lead_score,
  AVG(CASE WHEN enrichment_status = 'done' THEN 1.0 ELSE 0.0 END)::NUMERIC(5,4) AS enrichment_rate,
  AVG(CASE WHEN outreach_status IN ('replied', 'meeting_booked', 'closed_won') THEN 1.0 ELSE 0.0 END)::NUMERIC(5,4) AS reply_rate
FROM master_companies
WHERE is_archived = FALSE
GROUP BY pipeline_stage, city, company_type;

CREATE OR REPLACE VIEW monthly_spend AS
SELECT
  DATE_TRUNC('month', date)::DATE AS month,
  category,
  currency,
  SUM(amount)::NUMERIC(14,2) AS total_amount,
  COUNT(*) AS expense_count
FROM finances
WHERE is_active = TRUE
GROUP BY DATE_TRUNC('month', date), category, currency
ORDER BY month DESC, category;
