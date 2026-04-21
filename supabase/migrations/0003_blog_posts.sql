-- ============================================================
-- 0003 — blog_posts
--
-- CMS storage for the /blog/ section of autometa-ai.com.
-- Rows drive both the listing page and the individual post pages,
-- rendered by a Vercel serverless function on the public site.
--
-- Workflow:
--   draft           — being written (visible only in CRM)
--   pending_review  — AI-agent-submitted, waiting for human approval
--   published       — live on the public site
--   archived        — removed from the listing but kept for history
-- ============================================================

DO $$ BEGIN
  CREATE TYPE blog_post_status AS ENUM ('draft', 'pending_review', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE blog_post_source AS ENUM ('manual', 'ai_agent', 'import');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  status blog_post_status NOT NULL DEFAULT 'draft',
  source blog_post_source NOT NULL DEFAULT 'manual',
  source_model TEXT,                  -- e.g. 'claude-opus-4-7' for AI drafts

  -- Hero / card metadata
  title TEXT NOT NULL,
  subtitle TEXT,
  lede TEXT,                          -- subheadline under h1
  excerpt TEXT NOT NULL,              -- card blurb
  category TEXT NOT NULL,             -- core | ai | custom | ops (matches listing filter chips)
  tags TEXT[] DEFAULT '{}',
  cover_image_url TEXT,
  read_minutes INT,

  -- Author (usually same team member or a pen name)
  author_name TEXT NOT NULL DEFAULT 'Autometa Team',
  author_avatar_url TEXT,
  author_role TEXT,
  author_bio TEXT,

  -- Content — inner HTML of <article class="prose">. Can include
  -- <h2>, <h3>, <p>, <ul>, <ol>, <div class="callout">, <div class="pullquote">,
  -- <figure class="fig">, <div class="info-box">, <hr class="hr">.
  body_html TEXT,

  -- SEO
  seo_title TEXT,
  seo_description TEXT,

  -- Workflow
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,                    -- 'admin' | 'ai:<agent-name>' | email
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Raw AI payload (for audit / regeneration)
  raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_bp_status       ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_bp_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_category     ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_bp_source       ON blog_posts(source);

-- Trigger: bump updated_at on any write.
CREATE OR REPLACE FUNCTION trg_blog_posts_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_posts_updated_at ON blog_posts;
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION trg_blog_posts_set_updated_at();

-- ---------- View for the public site ----------
-- Never exposes drafts or archived posts. The marketing-site render
-- function queries this view.
CREATE OR REPLACE VIEW blog_posts_public AS
SELECT
  id,
  slug,
  title,
  subtitle,
  lede,
  excerpt,
  category,
  tags,
  cover_image_url,
  author_name,
  author_avatar_url,
  author_role,
  author_bio,
  read_minutes,
  body_html,
  seo_title,
  seo_description,
  published_at
FROM blog_posts
WHERE status = 'published'
  AND published_at IS NOT NULL
ORDER BY published_at DESC;

-- ---------- Seed the 7 existing static posts ----------
-- Idempotent inserts keyed by slug. Run ONCE at migration time;
-- after that, manage posts via the CRM or AI endpoints.
INSERT INTO blog_posts
  (slug, status, source, title, lede, excerpt, category, tags,
   cover_image_url, read_minutes, author_name, author_role,
   author_avatar_url, published_at, body_html, seo_description,
   created_by)
VALUES
  (
    'whatsapp-voice-agent-hallucinations',
    'published', 'import',
    'Why your WhatsApp voice agent keeps hallucinating, and the 3-file fix that solved it for 40 agents.',
    'We shipped an inbound voice agent for a Dubai brokerage that kept inventing building names. Here''s the exact prompt structure, tool definitions and RAG setup that made it reliable enough to put in front of real buyers.',
    'We shipped an inbound voice agent for a Dubai brokerage that kept inventing building names. Here''s the 3-file fix that made it reliable.',
    'ai', ARRAY['AI & Automation','Playbook'],
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1600&h=800&fit=crop',
    8, 'Sai Abhinav Dunna', 'Founder & CEO · Autometa AI',
    '/images/founder.jpeg',
    '2026-04-18T00:00:00Z',
    NULL, -- body is rehydrated from the existing static file via seed script
    'We shipped an inbound voice agent for a Dubai brokerage that kept inventing building names. Here''s the 3-file fix that made it reliable.',
    'import'
  ),
  (
    '7-crm-stages-residential-brokerage',
    'published', 'import',
    'The 7 CRM stages every residential brokerage actually needs (and the 4 that waste time).',
    'Most CRM setups we audit have 12+ stages. Here''s the pared-down pipeline structure that closes faster without losing signal.',
    'Most CRM setups we audit have 12+ stages. Here''s the pared-down pipeline structure that closes faster without losing signal.',
    'core', ARRAY['Core Systems'],
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&h=800&fit=crop',
    6, 'Sai Abhinav Dunna', 'Founder & CEO · Autometa AI',
    '/images/founder.jpeg',
    '2026-04-14T00:00:00Z',
    NULL,
    'Most CRM setups we audit have 12+ stages. Here''s the pared-down pipeline structure that closes faster without losing signal.',
    'import'
  ),
  (
    'ai-replaces-sdr-team-90-day-pnl',
    'published', 'import',
    'We replaced a 3-SDR outreach team with one AI agent. Here''s the 90-day P&L.',
    'Honest numbers from a real estate client: cost per qualified meeting, reply rates, and the failure modes nobody tells you about. What worked, what didn''t, and what we''d do differently.',
    'Honest numbers from a real estate client: cost per qualified meeting, reply rates, and the failure modes nobody tells you about.',
    'ai', ARRAY['AI & Automation'],
    'https://images.unsplash.com/photo-1517512006864-7edc3b933137?w=1600&h=800&fit=crop',
    10, 'Autometa Team', 'Autometa AI',
    NULL,
    '2026-04-10T00:00:00Z',
    NULL,
    'Honest 90-day P&L from a real estate client: cost per qualified meeting, reply rates, and the failure modes nobody tells you about.',
    'import'
  ),
  (
    'response-time-slas-that-stick',
    'published', 'import',
    'Response-time SLAs that actually stick: what we learned from 12 Dubai brokerages.',
    '"Reply within 5 minutes" is a fantasy without the right routing, escalation paths and Monday-morning accountability. Here''s what actually works when you want SLAs that survive the third week.',
    '"Reply within 5 minutes" is a fantasy without the right routing, escalation paths and Monday-morning accountability.',
    'ops', ARRAY['Ops & Process'],
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600&h=800&fit=crop',
    5, 'Autometa Team', 'Autometa AI',
    NULL,
    '2026-04-04T00:00:00Z',
    NULL,
    '"Reply within 5 minutes" is a fantasy without the right routing, escalation paths and Monday-morning accountability. What we learned from 12 Dubai brokerages.',
    'import'
  ),
  (
    'build-vs-buy-internal-tools-framework',
    'published', 'import',
    'When to build vs. when to buy: the 4-question framework for internal tools.',
    'HubSpot, Notion, Airtable, custom. Here''s how we decide, and the mistakes we''ve made going the wrong way. A practical framework you can run through in 20 minutes before your next tooling decision.',
    'HubSpot, Notion, Airtable, custom. Here''s how we decide, and the mistakes we''ve made going the wrong way.',
    'custom', ARRAY['Custom Builds'],
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1600&h=800&fit=crop',
    7, 'Sai Abhinav Dunna', 'Founder & CEO · Autometa AI',
    '/images/founder.jpeg',
    '2026-03-28T00:00:00Z',
    NULL,
    'HubSpot, Notion, Airtable, custom. Here''s the 4-question framework we use to decide, and the mistakes we''ve made going the wrong way.',
    'import'
  ),
  (
    'whatsapp-business-api-vs-third-party',
    'published', 'import',
    'WhatsApp Business API vs. the third-party shortcut: what we regret shipping.',
    'The 360dialog rug-pull, the Meta review queue, and why we now default to the slow path for every client. An honest retrospective on the three WhatsApp architectures we''ve shipped.',
    'The 360dialog rug-pull, the Meta review queue, and why we now default to the slow path for every client.',
    'core', ARRAY['Core Systems'],
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1600&h=800&fit=crop',
    9, 'Autometa Team', 'Autometa AI',
    NULL,
    '2026-03-22T00:00:00Z',
    NULL,
    'The 360dialog rug-pull, the Meta review queue, and why we now default to the slow path for every client.',
    'import'
  ),
  (
    'lead-scoring-4-signals-not-40',
    'published', 'import',
    'Lead scoring with 4 signals, not 40: the simplest model that beat the black-box.',
    'Attribute-based scoring is dead. Here''s the behavioural setup that doubled meeting rates for a mid-market agency. Four signals, one rule-based model, and the discipline to resist adding a fifth.',
    'Attribute-based scoring is dead. Here''s the behavioural setup that doubled meeting rates for a mid-market agency.',
    'ai', ARRAY['AI & Automation'],
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&h=800&fit=crop',
    6, 'Sai Abhinav Dunna', 'Founder & CEO · Autometa AI',
    '/images/founder.jpeg',
    '2026-03-15T00:00:00Z',
    NULL,
    'Attribute-based scoring is dead. Here''s the behavioural setup that doubled meeting rates for a mid-market agency.',
    'import'
  )
ON CONFLICT (slug) DO NOTHING;
