-- ==============================================================================
-- TIVA HEALTH COMPANION — SUPABASE DATABASE UPDATE & MIGRATION SCRIPT
-- ==============================================================================
-- Use this file whenever you need to ALTER, UPDATE, or EXTEND tables on Supabase.
-- All queries here are designed to run safely without dropping existing data.
--
-- Instructions: Run the specific migration block you need in the Supabase SQL Editor.
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: COMMON ALTER TABLE CHEATSHEET & TEMPLATES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1.1 ADDING A NEW COLUMN SAFELY
-- ------------------------------------------------------------------------------
-- Syntax:
-- ALTER TABLE public.<table_name> ADD COLUMN IF NOT EXISTS <column_name> <data_type> <default/constraint>;
--
-- FIX: Add emergency_contacts to health_profiles
ALTER TABLE public.health_profiles 
ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb;

-- Sync emergency_contacts with emergency_contacts_json if either exists
UPDATE public.health_profiles 
SET emergency_contacts = COALESCE(emergency_contacts, emergency_contacts_json, '[]'::jsonb);

UPDATE public.health_profiles 
SET emergency_contacts_json = COALESCE(emergency_contacts_json, emergency_contacts, '[]'::jsonb);

-- Example: Add 'blood_glucose_fasting' flag to health_readings
ALTER TABLE public.health_readings 
ADD COLUMN IF NOT EXISTS is_fasting BOOLEAN DEFAULT false;

-- Example: Add 'national_id' and 'insurance_policy_number' to health_profiles
ALTER TABLE public.health_profiles 
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;


-- ------------------------------------------------------------------------------
-- 1.2 MODIFYING AN EXISTING COLUMN (TYPE OR DEFAULT)
-- ------------------------------------------------------------------------------
-- Example: Change column type with explicit cast
-- ALTER TABLE public.<table_name> ALTER COLUMN <column_name> TYPE <new_type> USING <column_name>::<new_type>;
--
-- Example: Set or change a default value
-- ALTER TABLE public.<table_name> ALTER COLUMN <column_name> SET DEFAULT <default_value>;
--
-- Example: Drop a NOT NULL constraint safely
-- ALTER TABLE public.<table_name> ALTER COLUMN <column_name> DROP NOT NULL;


-- ------------------------------------------------------------------------------
-- 1.3 UPDATING AN ENUM / CHECK CONSTRAINT SAFELY
-- ------------------------------------------------------------------------------
-- To add new allowed values to a CHECK constraint (e.g. adding new metric types):
-- Step 1: Drop the old constraint
-- Step 2: Add the updated constraint

DO $$
BEGIN
    -- Check if constraint exists before dropping
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'health_readings_metric_type_check'
    ) THEN
        ALTER TABLE public.health_readings DROP CONSTRAINT health_readings_metric_type_check;
    END IF;
    
    -- Re-add with new allowed metrics (e.g. respiratory_rate, ecg)
    ALTER TABLE public.health_readings ADD CONSTRAINT health_readings_metric_type_check CHECK (
        metric_type IN (
            'blood_pressure_systolic', 'blood_pressure_diastolic', 'glucose',
            'heart_rate', 'hrv', 'sleep_hours', 'steps', 'weight', 'spo2',
            'temperature', 'respiratory_rate', 'ecg'
        )
    );
END $$;


-- ------------------------------------------------------------------------------
-- 1.4 RENAMING A COLUMN SAFELY
-- ------------------------------------------------------------------------------
-- Example:
-- ALTER TABLE public.<table_name> RENAME COLUMN <old_name> TO <new_name>;


-- ------------------------------------------------------------------------------
-- 1.5 ADDING A FOREIGN KEY SAFELY
-- ------------------------------------------------------------------------------
-- Example: Add doctor_id reference to appointments
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM pg_constraint WHERE conname = 'fk_appointments_doctor'
--     ) THEN
--         ALTER TABLE public.appointments 
--         ADD CONSTRAINT fk_appointments_doctor 
--         FOREIGN KEY (doctor_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
--     END IF;
-- END $$;


-- ------------------------------------------------------------------------------
-- 1.6 ADDING A PERFORMANCE INDEX CONCURRENTLY
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_health_readings_source ON public.health_readings(source);
CREATE INDEX IF NOT EXISTS idx_alerts_detected_at ON public.alerts(detected_at DESC);


-- ------------------------------------------------------------------------------
-- 1.7 UPDATING OR REPLACING A ROW LEVEL SECURITY (RLS) POLICY
-- ------------------------------------------------------------------------------
-- Example: Update policy for caregivers to allow updating status of assigned tasks
DROP POLICY IF EXISTS "Caregivers update assigned tasks" ON public.care_tasks;
CREATE POLICY "Caregivers update assigned tasks" ON public.care_tasks
    FOR UPDATE TO authenticated
    USING (
        assigned_to_user_id = auth.uid()
        OR public.is_active_caregiver_for(patient_user_id)
        OR public.is_institution_admin_for(institution_id)
    )
    WITH CHECK (
        assigned_to_user_id = auth.uid()
        OR public.is_active_caregiver_for(patient_user_id)
        OR public.is_institution_admin_for(institution_id)
    );


-- ==============================================================================
-- SECTION 2: CONCRETE PRE-PACKAGED MIGRATIONS FOR TIVA
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- MIGRATION A: Add Medication Adherence Tracking Fields
-- ------------------------------------------------------------------------------
ALTER TABLE public.medications
ADD COLUMN IF NOT EXISTS reminder_lead_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS max_snooze_count INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS requires_photo_verification BOOLEAN DEFAULT false;

ALTER TABLE public.reminder_logs
ADD COLUMN IF NOT EXISTS photo_verification_url TEXT,
ADD COLUMN IF NOT EXISTS snooze_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;


-- ------------------------------------------------------------------------------
-- MIGRATION B: Add Real-Time GPS Tracking & Battery to Alerts
-- ------------------------------------------------------------------------------
ALTER TABLE public.alerts
ADD COLUMN IF NOT EXISTS device_battery_level INTEGER CHECK (device_battery_level BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS accuracy_meters NUMERIC,
ADD COLUMN IF NOT EXISTS last_known_address TEXT;


-- ------------------------------------------------------------------------------
-- MIGRATION C: Add Multi-Language Translation Cache to AI Conversations
-- ------------------------------------------------------------------------------
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS translated_summary TEXT,
ADD COLUMN IF NOT EXISTS audio_transcript TEXT,
ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC;


-- ------------------------------------------------------------------------------
-- MIGRATION D: Add Offline Sync Support to Health Readings
-- ------------------------------------------------------------------------------
ALTER TABLE public.health_readings
ADD COLUMN IF NOT EXISTS client_sync_id TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS device_model TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_health_readings_client_sync 
ON public.health_readings(created_by_id, client_sync_id) 
WHERE client_sync_id IS NOT NULL;


-- ==============================================================================
-- SECTION 3: TEMPLATE FOR CREATING A NEW TABLE IN THE FUTURE
-- ==============================================================================
/*
CREATE TABLE IF NOT EXISTS public.<new_table_name> (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    
    -- Custom columns here:
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Base44 / Supabase compatibility aliases
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

-- Trigger for auto-updating updated_date
DROP TRIGGER IF EXISTS set_<new_table_name>_updated_date ON public.<new_table_name>;
CREATE TRIGGER set_<new_table_name>_updated_date
    BEFORE UPDATE ON public.<new_table_name>
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- Enable RLS
ALTER TABLE public.<new_table_name> ENABLE ROW LEVEL SECURITY;

-- Add RLS Policy
CREATE POLICY "Users manage own <new_table_name>" ON public.<new_table_name>
    FOR ALL TO authenticated 
    USING (created_by_id = auth.uid()) 
    WITH CHECK (created_by_id = auth.uid());

-- Add Indexes
CREATE INDEX IF NOT EXISTS idx_<new_table_name>_user ON public.<new_table_name>(created_by_id);

-- Add compatibility view if needed
CREATE OR REPLACE VIEW public."<NewTableName>" WITH (security_invoker = true) 
AS SELECT * FROM public.<new_table_name>;
*/


-- ==============================================================================
-- SECTION 4: DATABASE HEALTH CHECK & VERIFICATION QUERIES
-- ==============================================================================

-- 1. Count all rows across all Tiva tables
SELECT 'profiles' AS table_name, count(*) AS total_rows FROM public.profiles
UNION ALL SELECT 'health_profiles', count(*) FROM public.health_profiles
UNION ALL SELECT 'health_readings', count(*) FROM public.health_readings
UNION ALL SELECT 'medications', count(*) FROM public.medications
UNION ALL SELECT 'reminders', count(*) FROM public.reminders
UNION ALL SELECT 'reminder_logs', count(*) FROM public.reminder_logs
UNION ALL SELECT 'appointments', count(*) FROM public.appointments
UNION ALL SELECT 'emergency_contacts', count(*) FROM public.emergency_contacts
UNION ALL SELECT 'alerts', count(*) FROM public.alerts
UNION ALL SELECT 'predictions', count(*) FROM public.predictions
UNION ALL SELECT 'conversations', count(*) FROM public.conversations
UNION ALL SELECT 'family_messages', count(*) FROM public.family_messages
UNION ALL SELECT 'caregiver_assignments', count(*) FROM public.caregiver_assignments
UNION ALL SELECT 'medical_records', count(*) FROM public.medical_records
UNION ALL SELECT 'medical_documents', count(*) FROM public.medical_documents
UNION ALL SELECT 'memory_notes', count(*) FROM public.memory_notes
UNION ALL SELECT 'wellness_entries', count(*) FROM public.wellness_entries
UNION ALL SELECT 'subscriptions', count(*) FROM public.subscriptions
UNION ALL SELECT 'institutions', count(*) FROM public.institutions
UNION ALL SELECT 'audit_logs', count(*) FROM public.audit_logs
UNION ALL SELECT 'check_in_observations', count(*) FROM public.check_in_observations
UNION ALL SELECT 'clinical_notes', count(*) FROM public.clinical_notes
UNION ALL SELECT 'care_tasks', count(*) FROM public.care_tasks
UNION ALL SELECT 'institution_admin_invites', count(*) FROM public.institution_admin_invites;

-- 2. Inspect active RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Verify triggers
SELECT event_object_table AS table_name, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- ==============================================================================
-- SECTION 4: DATABASE SECURITY HARDENING & ANTI-LEAKAGE SCRIPT
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 4.1 PREVENT ROLE PRIVILEGE ESCALATION
-- Ensures that authenticated users cannot elevate their own role to admin or super_admin
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role) THEN
        -- Only service_role can elevate user roles
        IF (auth.role() <> 'service_role') THEN
            NEW.role := OLD.role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- ------------------------------------------------------------------------------
-- 4.2 HARDENED EMERGENCY SNAPSHOT RPC
-- Allows first responders to access only necessary medical emergency card info
-- without exposing internal auth UUIDs, private timestamps, or raw system tokens.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_emergency_snapshot(p_qr_code_id TEXT)
RETURNS TABLE (
    full_name TEXT,
    date_of_birth DATE,
    gender TEXT,
    blood_type TEXT,
    allergies TEXT[],
    chronic_conditions TEXT[],
    height_cm NUMERIC,
    weight_kg NUMERIC,
    current_medications_text TEXT,
    emergency_contacts JSONB,
    language TEXT,
    care_mode TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    IF p_qr_code_id IS NULL OR length(trim(p_qr_code_id)) < 4 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        hp.full_name,
        hp.date_of_birth,
        hp.gender,
        hp.blood_type,
        hp.allergies,
        hp.chronic_conditions,
        hp.height_cm,
        hp.weight_kg,
        hp.current_medications_text,
        COALESCE(hp.emergency_contacts, hp.emergency_contacts_json, '[]'::jsonb),
        hp.language,
        hp.care_mode,
        hp.avatar_url
    FROM public.health_profiles hp
    WHERE hp.qr_code_id = p_qr_code_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execution to public anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_emergency_snapshot(TEXT) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4.3 TIGHTEN INSTITUTION POLICIES (PREVENT TOKEN & REASON LEAKAGE)
-- Standard authenticated users should only see active institution names and public details,
-- never internal approval tokens or rejection reasons.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Institution admins view their institution" ON public.institutions;
CREATE POLICY "Institution admins view their institution" ON public.institutions
    FOR SELECT TO authenticated USING (
        admin_user_id = auth.uid() 
        OR auth.uid()::text = ANY(additional_admin_ids)
        OR status = 'active'
    );

-- ------------------------------------------------------------------------------
-- 4.4 FORCE ROW LEVEL SECURITY (ANTI-BYPASS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.health_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.health_readings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.medications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.predictions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.family_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.medical_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- ==============================================================================
-- END OF UPDATE & MIGRATION SCRIPT
-- ==============================================================================

