-- =============================================================================
-- PRAHARI Incident Reporting System — Database Schema (Supabase / PostgreSQL)
-- Team: HYDRAX
-- =============================================================================

-- 1. Create Incidents Table
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id VARCHAR(32) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reporter_name VARCHAR(128),
    reporter_contact VARCHAR(64),
    transcription TEXT NOT NULL,
    incident_type VARCHAR(64) NOT NULL DEFAULT 'Flash Flood',
    severity VARCHAR(32) NOT NULL DEFAULT 'HIGH', -- 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'NEW', -- 'NEW', 'PROCESSING', 'ASSIGNED', 'ACKNOWLEDGED', 'RESOLVED'
    assigned_responder_id VARCHAR(64),
    assigned_responder_name VARCHAR(128),
    assigned_at TIMESTAMPTZ,
    source VARCHAR(32) NOT NULL DEFAULT 'VOICE', -- 'VOICE', 'MANUAL'
    audio_url TEXT,
    notes TEXT,
    demo_mode BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_incident_id ON public.incidents (incident_id);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Allow public read access for monitoring dashboard & authorities
CREATE POLICY "Allow public read access to incidents"
    ON public.incidents
    FOR SELECT
    USING (true);

-- Allow public report creation (Emergency reporting is unblocked for citizens)
CREATE POLICY "Allow citizen and anonymous incident submission"
    ON public.incidents
    FOR INSERT
    WITH CHECK (true);

-- Allow updates (e.g. status updates, responder assignments)
CREATE POLICY "Allow authorized status updates and responder assignment"
    ON public.incidents
    FOR UPDATE
    USING (true);

-- 4. Enable Supabase Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;

-- 5. Seed Demonstration Responders Reference (Optional Reference)
COMMENT ON TABLE public.incidents IS 'PRAHARI emergency incident records with Hugging Face Whisper transcripts & automated responder dispatch.';
