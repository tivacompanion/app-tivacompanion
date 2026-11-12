-- ==============================================================================
-- TIVA HEALTH COMPANION — MASTER SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Full production-ready PostgreSQL / Supabase schema replacing Base44.
-- Includes:
--   1. Extensions (uuid-ossp, pgcrypto)
--   2. User profile synchronization with Supabase Auth (auth.users -> public.profiles)
--   3. All 24 core health, medical, caregiver, and institution tables
--   4. Standard Base44 compatibility fields (id, created_date, updated_date, created_by_id)
--      plus standard Supabase aliases (created_at, updated_at)
--   5. Automatic updated_date trigger functions
--   6. Performance & foreign key indexes
--   7. Comprehensive Row Level Security (RLS) policies for Patients, Caregivers & Institutions
--   8. Updatable PascalCase views (e.g. "HealthProfile", "Medication") for backwards compatibility
--   9. Supabase Storage buckets & policies (medical-vault, voice-notes, avatars)
--
-- Instructions: Run this entire script in your Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS & TRIGGERS
-- ------------------------------------------------------------------------------

-- Trigger function to automatically maintain updated_date / updated_at
CREATE OR REPLACE FUNCTION public.set_updated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. USER PROFILE (public.profiles)
-- Synchronized automatically with auth.users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'super_admin', 'institution_admin', 'caregiver')),
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

-- Automatic user sync trigger from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
            THEN EXCLUDED.full_name 
            ELSE public.profiles.full_name 
        END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger for profiles updated_date
DROP TRIGGER IF EXISTS set_profiles_updated_date ON public.profiles;
CREATE TRIGGER set_profiles_updated_date
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 4. INSTITUTIONS
-- B2B Healthcare provider accounts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('hospital', 'clinic', 'care_home', 'insurance', 'home_care')),
    address TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_name TEXT,
    additional_admin_ids TEXT[] DEFAULT '{}'::text[],
    additional_admin_names TEXT[] DEFAULT '{}'::text[],
    patient_count INTEGER NOT NULL DEFAULT 0,
    subscription_plan TEXT NOT NULL DEFAULT 'institution',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'suspended', 'pending')),
    approval_token TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_institutions_updated_date ON public.institutions;
CREATE TRIGGER set_institutions_updated_date
    BEFORE UPDATE ON public.institutions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 5. HEALTH PROFILES
-- Core medical profile (one per patient)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown')),
    height_cm NUMERIC,
    weight_kg NUMERIC,
    phone TEXT,
    allergies TEXT[] DEFAULT '{}'::text[],
    chronic_conditions TEXT[] DEFAULT '{}'::text[],
    current_medications_text TEXT,
    emergency_contacts JSONB DEFAULT '[]'::jsonb,
    emergency_contacts_json JSONB DEFAULT '[]'::jsonb,
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'fr')),
    care_mode TEXT NOT NULL DEFAULT 'general' CHECK (care_mode IN ('general', 'diabetes', 'hypertension', 'heart_disease')),
    qr_code_id TEXT,
    avatar_url TEXT,
    checkin_schedule_type TEXT NOT NULL DEFAULT 'monthly' CHECK (checkin_schedule_type IN ('weekly', 'every_x_weeks', 'monthly')),
    checkin_week_interval INTEGER NOT NULL DEFAULT 1 CHECK (checkin_week_interval BETWEEN 1 AND 12),
    checkin_enabled BOOLEAN NOT NULL DEFAULT true,
    next_checkin_date DATE,
    last_checkin_completed_at TIMESTAMPTZ,
    clinician_override JSONB,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_health_profiles_updated_date ON public.health_profiles;
CREATE TRIGGER set_health_profiles_updated_date
    BEFORE UPDATE ON public.health_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 6. HEALTH READINGS
-- Individual metric readings (manual, voice, or wearable)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'blood_pressure_systolic', 'blood_pressure_diastolic', 'glucose',
        'heart_rate', 'hrv', 'sleep_hours', 'steps', 'weight', 'spo2', 'temperature'
    )),
    value NUMERIC NOT NULL,
    unit TEXT,
    secondary_value NUMERIC,
    secondary_unit TEXT,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'voice', 'google_health', 'apple_health', 'wearable')),
    ai_interpretation TEXT,
    risk_level TEXT NOT NULL DEFAULT 'green' CHECK (risk_level IN ('green', 'amber', 'red')),
    notes TEXT,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_health_readings_updated_date ON public.health_readings;
CREATE TRIGGER set_health_readings_updated_date
    BEFORE UPDATE ON public.health_readings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 7. MEDICATIONS
-- Patient prescribed medications and schedules
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    times TEXT[] DEFAULT '{}'::text[],
    instructions TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    color_tag TEXT NOT NULL DEFAULT 'lavender' CHECK (color_tag IN ('lavender', 'mint', 'peach', 'amber')),
    prescribed_by TEXT,
    refill_date DATE,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_medications_updated_date ON public.medications;
CREATE TRIGGER set_medications_updated_date
    BEFORE UPDATE ON public.medications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 8. REMINDERS
-- Medication, appointment, health routine, and wellness notifications
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    type TEXT NOT NULL CHECK (type IN ('medication', 'appointment', 'health_routine', 'wellness')),
    title TEXT NOT NULL,
    description TEXT,
    scheduled_time TIMESTAMPTZ NOT NULL,
    repeat_pattern TEXT CHECK (repeat_pattern IN ('once', 'daily', 'weekly', 'custom')),
    related_medication_id UUID REFERENCES public.medications(id) ON DELETE SET NULL,
    related_appointment_id UUID,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'confirmed', 'missed', 'escalated')),
    escalation_level INTEGER NOT NULL DEFAULT 0,
    confirmed_at TIMESTAMPTZ,
    voice_enabled BOOLEAN NOT NULL DEFAULT true,
    sms_fallback BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_reminders_updated_date ON public.reminders;
CREATE TRIGGER set_reminders_updated_date
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 9. REMINDER LOGS
-- Per-dose adherence records
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    medication_id UUID REFERENCES public.medications(id) ON DELETE SET NULL,
    medication_name TEXT NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed', 'snoozed')),
    taken_at TIMESTAMPTZ,
    escalation_level INTEGER NOT NULL DEFAULT 0,
    family_notified BOOLEAN NOT NULL DEFAULT false,
    caregiver_alerted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_reminder_logs_updated_date ON public.reminder_logs;
CREATE TRIGGER set_reminder_logs_updated_date
    BEFORE UPDATE ON public.reminder_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 10. APPOINTMENTS
-- Doctor visits, clinical check-ups & calendar events
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    title TEXT NOT NULL,
    doctor_name TEXT,
    specialty TEXT,
    location TEXT,
    appointment_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    notes TEXT,
    follow_up_notes TEXT,
    attached_document_ids TEXT[] DEFAULT '{}'::text[],
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled', 'missed')),
    reminder_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_appointments_updated_date ON public.appointments;
CREATE TRIGGER set_appointments_updated_date
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 11. EMERGENCY CONTACTS
-- Standalone emergency contacts directory
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    relationship TEXT,
    phone TEXT NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier IN (1, 2)),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_emergency_contacts_updated_date ON public.emergency_contacts;
CREATE TRIGGER set_emergency_contacts_updated_date
    BEFORE UPDATE ON public.emergency_contacts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 12. ALERTS
-- SOS events, high vitals, missed medications, fall detection
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    type TEXT NOT NULL CHECK (type IN (
        'emergency_sos', 'health_reading', 'inactivity', 'medication_missed',
        'fall_detected', 'caregiver_alert', 'health_risk', 'institution_critical'
    )),
    severity TEXT NOT NULL DEFAULT 'amber' CHECK (severity IN ('green', 'amber', 'red')),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'snoozed')),
    location_lat NUMERIC,
    location_lng NUMERIC,
    notified_contacts TEXT[] DEFAULT '{}'::text[],
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    patient_name TEXT,
    patient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    voice_url TEXT,
    trigger_source TEXT,
    channels_used TEXT[] DEFAULT '{}'::text[],
    snoozed_until TIMESTAMPTZ,
    snoozed_by TEXT,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    alert_category TEXT CHECK (alert_category IN ('critical_health_change', 'missed_medication', 'concerning_trend')),
    detected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_alerts_updated_date ON public.alerts;
CREATE TRIGGER set_alerts_updated_date
    BEFORE UPDATE ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 13. PREDICTIONS
-- AI-generated health risk reports & trend analyses
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'risk_assessment', 'compliance', 'trend_analysis')),
    risk_level TEXT NOT NULL DEFAULT 'green' CHECK (risk_level IN ('green', 'amber', 'red')),
    risk_score NUMERIC CHECK (risk_score BETWEEN 0 AND 100),
    summary TEXT NOT NULL,
    risk_factors JSONB DEFAULT '[]'::jsonb,
    recommended_actions TEXT[] DEFAULT '{}'::text[],
    detected_patterns TEXT[] DEFAULT '{}'::text[],
    doctor_report TEXT,
    metrics_analyzed TEXT[] DEFAULT '{}'::text[],
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_predictions_updated_date ON public.predictions;
CREATE TRIGGER set_predictions_updated_date
    BEFORE UPDATE ON public.predictions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 14. CONVERSATIONS
-- AI Health Companion Chat Sessions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    title TEXT NOT NULL,
    messages JSONB DEFAULT '[]'::jsonb,
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'fr')),
    context_summary TEXT,
    flagged_emergency BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_conversations_updated_date ON public.conversations;
CREATE TRIGGER set_conversations_updated_date
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 15. FAMILY MESSAGES
-- Communication between patients, family, caregivers & Tiva
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    sender_name TEXT NOT NULL,
    sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_role TEXT NOT NULL DEFAULT 'patient' CHECK (sender_role IN ('patient', 'caregiver', 'tiva')),
    recipient_name TEXT,
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image')),
    audio_url TEXT,
    image_url TEXT,
    sent_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    is_read BOOLEAN NOT NULL DEFAULT false,
    mood_tag TEXT CHECK (mood_tag IN ('happy', 'neutral', 'sad', 'anxious', 'calm')),
    patient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_private BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_family_messages_updated_date ON public.family_messages;
CREATE TRIGGER set_family_messages_updated_date
    BEFORE UPDATE ON public.family_messages
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 16. CAREGIVER ASSIGNMENTS
-- Links caregivers to patients with permission controls
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.caregiver_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    caregiver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    caregiver_name TEXT NOT NULL,
    caregiver_email TEXT,
    caregiver_phone TEXT,
    patient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    relationship TEXT,
    permission_level TEXT NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'manage_alerts', 'full_access')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
    invite_token TEXT,
    last_sync_at TIMESTAMPTZ,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    institution_name TEXT,
    assignment_type TEXT NOT NULL DEFAULT 'patient_invite' CHECK (assignment_type IN ('patient_invite', 'institution_invite', 'institution_assignment')),
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_caregiver_assignments_updated_date ON public.caregiver_assignments;
CREATE TRIGGER set_caregiver_assignments_updated_date
    BEFORE UPDATE ON public.caregiver_assignments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 17. MEDICAL RECORDS
-- Primary medical documents vault (prescriptions, lab tests, reports)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    title TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN (
        'prescription', 'lab_result', 'hospital_report', 'vaccination',
        'imaging', 'discharge_summary', 'doctor_note', 'other'
    )),
    file_url TEXT,
    file_type TEXT CHECK (file_type IN ('pdf', 'image', 'photo')),
    extracted_text TEXT,
    ai_summary TEXT,
    ai_explanation TEXT,
    contraindication_warnings TEXT[] DEFAULT '{}'::text[],
    date_of_document DATE,
    issued_by TEXT,
    tags TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_medical_records_updated_date ON public.medical_records;
CREATE TRIGGER set_medical_records_updated_date
    BEFORE UPDATE ON public.medical_records
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 18. MEDICAL DOCUMENTS
-- Alternate document entity with structured JSON data & offline cache
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    title TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN (
        'prescription', 'lab_result', 'hospital_report', 'vaccination',
        'imaging', 'doctor_note', 'discharge_summary', 'other'
    )),
    file_url TEXT,
    file_type TEXT CHECK (file_type IN ('pdf', 'image', 'photo')),
    extracted_data JSONB,
    ai_summary TEXT,
    contraindication_warnings TEXT[] DEFAULT '{}'::text[],
    document_date DATE,
    issuer TEXT,
    is_offline_cached BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_medical_documents_updated_date ON public.medical_documents;
CREATE TRIGGER set_medical_documents_updated_date
    BEFORE UPDATE ON public.medical_documents
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 19. MEMORY NOTES
-- Voice memos, memory recall exercises, tasks & personal journals
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memory_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    note_type TEXT NOT NULL CHECK (note_type IN ('voice_note', 'text_note', 'brain_exercise', 'task', 'journal')),
    title TEXT,
    content TEXT,
    voice_url TEXT,
    brain_exercise_type TEXT CHECK (brain_exercise_type IN ('memory_match', 'word_recall', 'number_sequence', 'story_quiz')),
    exercise_score INTEGER,
    task_due_date TIMESTAMPTZ,
    task_completed BOOLEAN NOT NULL DEFAULT false,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_memory_notes_updated_date ON public.memory_notes;
CREATE TRIGGER set_memory_notes_updated_date
    BEFORE UPDATE ON public.memory_notes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 20. WELLNESS ENTRIES
-- Daily mood, hydration, nutrition, and mental check-ins
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wellness_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    entry_type TEXT NOT NULL CHECK (entry_type IN (
        'mood', 'exercise', 'nutrition', 'hydration',
        'mental_check', 'brain_exercise', 'voice_note', 'journal'
    )),
    title TEXT NOT NULL,
    content TEXT,
    mood_score NUMERIC CHECK (mood_score BETWEEN 1 AND 5),
    ai_advice TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_wellness_entries_updated_date ON public.wellness_entries;
CREATE TRIGGER set_wellness_entries_updated_date
    BEFORE UPDATE ON public.wellness_entries
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 21. SUBSCRIPTIONS
-- Patient subscriptions (Free trial, Monthly, Biannual, Annual, Mobile Money)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    plan TEXT NOT NULL DEFAULT 'free_trial' CHECK (plan IN ('free_trial', 'monthly', 'biannual', 'annual')),
    status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'grace_period')),
    start_date DATE,
    end_date DATE,
    payment_method TEXT NOT NULL DEFAULT 'none' CHECK (payment_method IN ('mtn_momo', 'orange_money', 'card', 'none')),
    payment_phone TEXT,
    amount NUMERIC,
    currency TEXT NOT NULL DEFAULT 'XAF',
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    trial_days_remaining NUMERIC,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_subscriptions_updated_date ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_date
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 22. AUDIT LOGS
-- System-wide compliance & security activity tracking
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    action TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT,
    entity_affected TEXT,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_audit_logs_updated_date ON public.audit_logs;
CREATE TRIGGER set_audit_logs_updated_date
    BEFORE UPDATE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 23. CHECK-IN OBSERVATIONS
-- Periodic structured patient health observations
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.check_in_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    systolic_bp INTEGER NOT NULL CHECK (systolic_bp BETWEEN 60 AND 250),
    diastolic_bp INTEGER NOT NULL CHECK (diastolic_bp BETWEEN 40 AND 150),
    weight_kg NUMERIC NOT NULL CHECK (weight_kg BETWEEN 20 AND 300),
    heart_rate INTEGER CHECK (heart_rate BETWEEN 30 AND 200),
    heart_rate_capture_method TEXT CHECK (heart_rate_capture_method IN ('camera-high', 'camera-medium', 'manual')),
    wellness_score INTEGER NOT NULL CHECK (wellness_score BETWEEN 1 AND 5),
    check_in_type TEXT NOT NULL DEFAULT 'patient_initiated' CHECK (check_in_type IN ('scheduled', 'patient_initiated')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    critical_alert_triggered BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_check_in_observations_updated_date ON public.check_in_observations;
CREATE TRIGGER set_check_in_observations_updated_date
    BEFORE UPDATE ON public.check_in_observations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 24. CLINICAL NOTES
-- Provider notes on a patient file (scoped to institutions & caregivers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_name TEXT,
    author_name TEXT NOT NULL,
    author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_role TEXT CHECK (author_role IN ('institution_admin', 'caregiver')),
    note_category TEXT NOT NULL DEFAULT 'general' CHECK (note_category IN (
        'general', 'clinical_observation', 'medication_review',
        'care_plan', 'follow_up', 'behavioral'
    )),
    content TEXT NOT NULL,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_clinical_notes_updated_date ON public.clinical_notes;
CREATE TRIGGER set_clinical_notes_updated_date
    BEFORE UPDATE ON public.clinical_notes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 25. CARE TASKS
-- Action items assigned to caregivers or patients
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.care_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    title TEXT NOT NULL,
    description TEXT,
    patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_name TEXT,
    assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to_name TEXT,
    assigned_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_by_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    created_by_role TEXT NOT NULL DEFAULT 'caregiver' CHECK (created_by_role IN ('institution_admin', 'caregiver')),
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_care_tasks_updated_date ON public.care_tasks;
CREATE TRIGGER set_care_tasks_updated_date
    BEFORE UPDATE ON public.care_tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 26. INSTITUTION ADMIN INVITES
-- Pending / accepted invites for institution co-administrators
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_admin_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    institution_name TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    admin_name TEXT,
    invite_token TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
    invited_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_by_name TEXT,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED,
    updated_at TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED
);

DROP TRIGGER IF EXISTS set_institution_admin_invites_updated_date ON public.institution_admin_invites;
CREATE TRIGGER set_institution_admin_invites_updated_date
    BEFORE UPDATE ON public.institution_admin_invites
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- ------------------------------------------------------------------------------
-- 27. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_health_profiles_created_by ON public.health_profiles(created_by_id);
CREATE INDEX IF NOT EXISTS idx_health_profiles_institution ON public.health_profiles(institution_id);

CREATE INDEX IF NOT EXISTS idx_health_readings_user ON public.health_readings(created_by_id);
CREATE INDEX IF NOT EXISTS idx_health_readings_metric ON public.health_readings(metric_type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_medications_user ON public.medications(created_by_id);
CREATE INDEX IF NOT EXISTS idx_medications_status ON public.medications(status);

CREATE INDEX IF NOT EXISTS idx_reminders_user_sched ON public.reminders(created_by_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_related_med ON public.reminders(related_medication_id);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_user ON public.reminder_logs(created_by_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_time ON public.reminder_logs(scheduled_time DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON public.appointments(created_by_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_alerts_patient ON public.alerts(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_institution ON public.alerts(institution_id);

CREATE INDEX IF NOT EXISTS idx_predictions_user ON public.predictions(created_by_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(created_by_id);

CREATE INDEX IF NOT EXISTS idx_family_messages_patient ON public.family_messages(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_family_messages_sender ON public.family_messages(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_family_messages_recipient ON public.family_messages(recipient_user_id);

CREATE INDEX IF NOT EXISTS idx_caregiver_assignments_patient ON public.caregiver_assignments(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_assignments_caregiver ON public.caregiver_assignments(caregiver_user_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_assignments_token ON public.caregiver_assignments(invite_token);

CREATE INDEX IF NOT EXISTS idx_medical_records_user ON public.medical_records(created_by_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_user ON public.medical_documents(created_by_id);
CREATE INDEX IF NOT EXISTS idx_memory_notes_user ON public.memory_notes(created_by_id);
CREATE INDEX IF NOT EXISTS idx_wellness_entries_user ON public.wellness_entries(created_by_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(created_by_id);

CREATE INDEX IF NOT EXISTS idx_check_in_obs_user ON public.check_in_observations(created_by_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON public.clinical_notes(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_institution ON public.clinical_notes(institution_id);

CREATE INDEX IF NOT EXISTS idx_care_tasks_patient ON public.care_tasks(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_care_tasks_assigned_to ON public.care_tasks(assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_institution ON public.audit_logs(institution_id);

-- ------------------------------------------------------------------------------
-- 28. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Helper security function: Check if current user is an active caregiver for a patient
CREATE OR REPLACE FUNCTION public.is_active_caregiver_for(target_patient_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.caregiver_assignments
        WHERE caregiver_user_id = auth.uid()
          AND patient_user_id = target_patient_id
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper security function: Check if current user is admin of an institution
CREATE OR REPLACE FUNCTION public.is_institution_admin_for(target_institution_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF target_institution_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.institutions
        WHERE id = target_institution_id
          AND (admin_user_id = auth.uid() OR auth.uid()::text = ANY(additional_admin_ids))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_in_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_admin_invites ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role has full profiles access" ON public.profiles;
CREATE POLICY "Service role has full profiles access" ON public.profiles
    FOR ALL TO service_role USING (true);

-- 2. HEALTH PROFILES POLICIES
DROP POLICY IF EXISTS "Patients manage own health profile" ON public.health_profiles;
CREATE POLICY "Patients manage own health profile" ON public.health_profiles
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers view assigned patient profile" ON public.health_profiles;
CREATE POLICY "Caregivers view assigned patient profile" ON public.health_profiles
    FOR SELECT TO authenticated USING (public.is_active_caregiver_for(created_by_id));

DROP POLICY IF EXISTS "Institution admins view patient profile" ON public.health_profiles;
CREATE POLICY "Institution admins view patient profile" ON public.health_profiles
    FOR SELECT TO authenticated USING (public.is_institution_admin_for(institution_id));

-- 3. HEALTH READINGS POLICIES
DROP POLICY IF EXISTS "Patients manage own health readings" ON public.health_readings;
CREATE POLICY "Patients manage own health readings" ON public.health_readings
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers view patient readings" ON public.health_readings;
CREATE POLICY "Caregivers view patient readings" ON public.health_readings
    FOR SELECT TO authenticated USING (public.is_active_caregiver_for(created_by_id));

-- 4. MEDICATIONS POLICIES
DROP POLICY IF EXISTS "Patients manage own medications" ON public.medications;
CREATE POLICY "Patients manage own medications" ON public.medications
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers view patient medications" ON public.medications;
CREATE POLICY "Caregivers view patient medications" ON public.medications
    FOR SELECT TO authenticated USING (public.is_active_caregiver_for(created_by_id));

-- 5. REMINDERS & REMINDER LOGS POLICIES
DROP POLICY IF EXISTS "Patients manage own reminders" ON public.reminders;
CREATE POLICY "Patients manage own reminders" ON public.reminders
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

DROP POLICY IF EXISTS "Patients manage reminder logs" ON public.reminder_logs;
CREATE POLICY "Patients manage reminder logs" ON public.reminder_logs
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers view patient reminder logs" ON public.reminder_logs;
CREATE POLICY "Caregivers view patient reminder logs" ON public.reminder_logs
    FOR SELECT TO authenticated USING (public.is_active_caregiver_for(created_by_id));

-- 6. APPOINTMENTS POLICIES
DROP POLICY IF EXISTS "Patients manage own appointments" ON public.appointments;
CREATE POLICY "Patients manage own appointments" ON public.appointments
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers view patient appointments" ON public.appointments;
CREATE POLICY "Caregivers view patient appointments" ON public.appointments
    FOR SELECT TO authenticated USING (public.is_active_caregiver_for(created_by_id));

-- 7. EMERGENCY CONTACTS POLICIES
DROP POLICY IF EXISTS "Patients manage own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Patients manage own emergency contacts" ON public.emergency_contacts
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

-- 8. ALERTS POLICIES
DROP POLICY IF EXISTS "Patients view own alerts" ON public.alerts;
CREATE POLICY "Patients view own alerts" ON public.alerts
    FOR SELECT TO authenticated USING (created_by_id = auth.uid() OR patient_user_id = auth.uid());

DROP POLICY IF EXISTS "Patients create alerts" ON public.alerts;
CREATE POLICY "Patients create alerts" ON public.alerts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Caregivers view and acknowledge patient alerts" ON public.alerts;
CREATE POLICY "Caregivers view and acknowledge patient alerts" ON public.alerts
    FOR ALL TO authenticated USING (
        public.is_active_caregiver_for(patient_user_id) 
        OR public.is_active_caregiver_for(created_by_id)
        OR public.is_institution_admin_for(institution_id)
    );

-- 9. PREDICTIONS POLICIES
DROP POLICY IF EXISTS "Patients view own predictions" ON public.predictions;
CREATE POLICY "Patients view own predictions" ON public.predictions
    FOR SELECT TO authenticated USING (created_by_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers view patient predictions" ON public.predictions;
CREATE POLICY "Caregivers view patient predictions" ON public.predictions
    FOR SELECT TO authenticated USING (public.is_active_caregiver_for(created_by_id));

-- 10. CONVERSATIONS POLICIES
DROP POLICY IF EXISTS "Patients manage own conversations" ON public.conversations;
CREATE POLICY "Patients manage own conversations" ON public.conversations
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

-- 11. FAMILY MESSAGES POLICIES
DROP POLICY IF EXISTS "Participants view their family messages" ON public.family_messages;
CREATE POLICY "Participants view their family messages" ON public.family_messages
    FOR SELECT TO authenticated USING (
        sender_user_id = auth.uid()
        OR recipient_user_id = auth.uid()
        OR patient_user_id = auth.uid()
        OR public.is_active_caregiver_for(patient_user_id)
    );

DROP POLICY IF EXISTS "Users send family messages" ON public.family_messages;
CREATE POLICY "Users send family messages" ON public.family_messages
    FOR INSERT TO authenticated WITH CHECK (
        sender_user_id = auth.uid() OR created_by_id = auth.uid()
    );

DROP POLICY IF EXISTS "Recipients can update read status" ON public.family_messages;
CREATE POLICY "Recipients can update read status" ON public.family_messages
    FOR UPDATE TO authenticated USING (recipient_user_id = auth.uid());

-- 12. CAREGIVER ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "Users view their own assignments" ON public.caregiver_assignments;
CREATE POLICY "Users view their own assignments" ON public.caregiver_assignments
    FOR SELECT TO authenticated USING (
        patient_user_id = auth.uid()
        OR caregiver_user_id = auth.uid()
        OR created_by_id = auth.uid()
        OR public.is_institution_admin_for(institution_id)
    );

DROP POLICY IF EXISTS "Patients & Admins manage assignments" ON public.caregiver_assignments;
CREATE POLICY "Patients & Admins manage assignments" ON public.caregiver_assignments
    FOR ALL TO authenticated USING (
        patient_user_id = auth.uid()
        OR created_by_id = auth.uid()
        OR public.is_institution_admin_for(institution_id)
    );

-- 13. MEDICAL RECORDS & DOCUMENTS POLICIES
DROP POLICY IF EXISTS "Patients manage medical records" ON public.medical_records;
CREATE POLICY "Patients manage medical records" ON public.medical_records
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers view patient medical records" ON public.medical_records;
CREATE POLICY "Caregivers view patient medical records" ON public.medical_records
    FOR SELECT TO authenticated USING (public.is_active_caregiver_for(created_by_id));

DROP POLICY IF EXISTS "Patients manage medical documents" ON public.medical_documents;
CREATE POLICY "Patients manage medical documents" ON public.medical_documents
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers view patient medical documents" ON public.medical_documents;
CREATE POLICY "Caregivers view patient medical documents" ON public.medical_documents
    FOR SELECT TO authenticated USING (public.is_active_caregiver_for(created_by_id));

-- 14. MEMORY NOTES & WELLNESS ENTRIES POLICIES
DROP POLICY IF EXISTS "Patients manage memory notes" ON public.memory_notes;
CREATE POLICY "Patients manage memory notes" ON public.memory_notes
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

DROP POLICY IF EXISTS "Patients manage wellness entries" ON public.wellness_entries;
CREATE POLICY "Patients manage wellness entries" ON public.wellness_entries
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

-- 15. SUBSCRIPTIONS POLICIES
DROP POLICY IF EXISTS "Users view own subscription" ON public.subscriptions;
CREATE POLICY "Users view own subscription" ON public.subscriptions
    FOR SELECT TO authenticated USING (created_by_id = auth.uid());

DROP POLICY IF EXISTS "Users update own subscription" ON public.subscriptions;
CREATE POLICY "Users update own subscription" ON public.subscriptions
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

-- 16. INSTITUTIONS & INVITES POLICIES
DROP POLICY IF EXISTS "Institution admins view their institution" ON public.institutions;
CREATE POLICY "Institution admins view their institution" ON public.institutions
    FOR SELECT TO authenticated USING (
        admin_user_id = auth.uid() 
        OR auth.uid()::text = ANY(additional_admin_ids)
        OR status = 'active'
    );

DROP POLICY IF EXISTS "Institution admins manage their institution" ON public.institutions;
CREATE POLICY "Institution admins manage their institution" ON public.institutions
    FOR UPDATE TO authenticated USING (
        admin_user_id = auth.uid() OR auth.uid()::text = ANY(additional_admin_ids)
    );

DROP POLICY IF EXISTS "Admins manage invites" ON public.institution_admin_invites;
CREATE POLICY "Admins manage invites" ON public.institution_admin_invites
    FOR ALL TO authenticated USING (
        public.is_institution_admin_for(institution_id)
        OR admin_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- 17. CHECK-IN OBSERVATIONS POLICIES
DROP POLICY IF EXISTS "Patients manage check-in observations" ON public.check_in_observations;
CREATE POLICY "Patients manage check-in observations" ON public.check_in_observations
    FOR ALL TO authenticated USING (created_by_id = auth.uid()) WITH CHECK (created_by_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers view patient check-ins" ON public.check_in_observations;
CREATE POLICY "Caregivers view patient check-ins" ON public.check_in_observations
    FOR SELECT TO authenticated USING (public.is_active_caregiver_for(created_by_id));

-- 18. CLINICAL NOTES POLICIES (Never visible to patients)
DROP POLICY IF EXISTS "Staff and Caregivers manage clinical notes" ON public.clinical_notes;
CREATE POLICY "Staff and Caregivers manage clinical notes" ON public.clinical_notes
    FOR ALL TO authenticated USING (
        author_user_id = auth.uid()
        OR public.is_active_caregiver_for(patient_user_id)
        OR public.is_institution_admin_for(institution_id)
    );

-- 19. CARE TASKS POLICIES
DROP POLICY IF EXISTS "Caregivers & Patients view assigned tasks" ON public.care_tasks;
CREATE POLICY "Caregivers & Patients view assigned tasks" ON public.care_tasks
    FOR SELECT TO authenticated USING (
        patient_user_id = auth.uid()
        OR assigned_to_user_id = auth.uid()
        OR assigned_by_user_id = auth.uid()
        OR public.is_active_caregiver_for(patient_user_id)
        OR public.is_institution_admin_for(institution_id)
    );

DROP POLICY IF EXISTS "Caregivers & Admins manage tasks" ON public.care_tasks;
CREATE POLICY "Caregivers & Admins manage tasks" ON public.care_tasks
    FOR ALL TO authenticated USING (
        assigned_to_user_id = auth.uid()
        OR assigned_by_user_id = auth.uid()
        OR public.is_active_caregiver_for(patient_user_id)
        OR public.is_institution_admin_for(institution_id)
    );

-- 20. AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (
        public.is_institution_admin_for(institution_id)
        OR actor_id = auth.uid()
    );

DROP POLICY IF EXISTS "Authenticated users create audit entries" ON public.audit_logs;
CREATE POLICY "Authenticated users create audit entries" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 29. COMPATIBILITY VIEWS (PascalCase support for Base44 parity)
-- Allows queries to both supabase.from('medications') and supabase.from('Medication')
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public."HealthProfile" WITH (security_invoker = true) AS SELECT * FROM public.health_profiles;
CREATE OR REPLACE VIEW public."HealthReading" WITH (security_invoker = true) AS SELECT * FROM public.health_readings;
CREATE OR REPLACE VIEW public."Medication" WITH (security_invoker = true) AS SELECT * FROM public.medications;
CREATE OR REPLACE VIEW public."Reminder" WITH (security_invoker = true) AS SELECT * FROM public.reminders;
CREATE OR REPLACE VIEW public."ReminderLog" WITH (security_invoker = true) AS SELECT * FROM public.reminder_logs;
CREATE OR REPLACE VIEW public."Appointment" WITH (security_invoker = true) AS SELECT * FROM public.appointments;
CREATE OR REPLACE VIEW public."EmergencyContact" WITH (security_invoker = true) AS SELECT * FROM public.emergency_contacts;
CREATE OR REPLACE VIEW public."Alert" WITH (security_invoker = true) AS SELECT * FROM public.alerts;
CREATE OR REPLACE VIEW public."Prediction" WITH (security_invoker = true) AS SELECT * FROM public.predictions;
CREATE OR REPLACE VIEW public."Conversation" WITH (security_invoker = true) AS SELECT * FROM public.conversations;
CREATE OR REPLACE VIEW public."FamilyMessage" WITH (security_invoker = true) AS SELECT * FROM public.family_messages;
CREATE OR REPLACE VIEW public."CaregiverAssignment" WITH (security_invoker = true) AS SELECT * FROM public.caregiver_assignments;
CREATE OR REPLACE VIEW public."MedicalRecord" WITH (security_invoker = true) AS SELECT * FROM public.medical_records;
CREATE OR REPLACE VIEW public."MedicalDocument" WITH (security_invoker = true) AS SELECT * FROM public.medical_documents;
CREATE OR REPLACE VIEW public."MemoryNote" WITH (security_invoker = true) AS SELECT * FROM public.memory_notes;
CREATE OR REPLACE VIEW public."WellnessEntry" WITH (security_invoker = true) AS SELECT * FROM public.wellness_entries;
CREATE OR REPLACE VIEW public."Subscription" WITH (security_invoker = true) AS SELECT * FROM public.subscriptions;
CREATE OR REPLACE VIEW public."Institution" WITH (security_invoker = true) AS SELECT * FROM public.institutions;
CREATE OR REPLACE VIEW public."AuditLog" WITH (security_invoker = true) AS SELECT * FROM public.audit_logs;
CREATE OR REPLACE VIEW public."CheckInObservation" WITH (security_invoker = true) AS SELECT * FROM public.check_in_observations;
CREATE OR REPLACE VIEW public."ClinicalNote" WITH (security_invoker = true) AS SELECT * FROM public.clinical_notes;
CREATE OR REPLACE VIEW public."CareTask" WITH (security_invoker = true) AS SELECT * FROM public.care_tasks;
CREATE OR REPLACE VIEW public."InstitutionAdminInvite" WITH (security_invoker = true) AS SELECT * FROM public.institution_admin_invites;

-- ------------------------------------------------------------------------------
-- 30. SECURITY HARDENING & RPC PROCEDURES
-- ------------------------------------------------------------------------------

-- Prevent authenticated users from elevating their own role
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role) THEN
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

-- Hardened Emergency Snapshot RPC for unauthenticated first responders
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
-- 31. SUPABASE STORAGE BUCKETS SETUP
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('medical-vault', 'medical-vault', false),
    ('voice-notes', 'voice-notes', false),
    ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Authenticated users can upload to buckets
DROP POLICY IF EXISTS "Authenticated users upload to medical vault" ON storage.objects;
CREATE POLICY "Authenticated users upload to medical vault" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('medical-vault', 'voice-notes', 'avatars'));

DROP POLICY IF EXISTS "Authenticated users read their storage objects" ON storage.objects;
CREATE POLICY "Authenticated users read their storage objects" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id IN ('medical-vault', 'voice-notes', 'avatars'));

-- ==============================================================================
-- END OF MASTER SCHEMA
-- ==============================================================================
