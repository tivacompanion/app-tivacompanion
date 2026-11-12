# Tiva — Supabase Database Log & SQL Reference

Comprehensive reference and SQL codebase for all entities (database tables) in the **Tiva Health Companion** platform running on **Supabase (PostgreSQL)**, completely replacing Base44.

---

## 1. Quick Start: Deploying to Supabase

1. Open your **[Supabase Dashboard](https://supabase.com/dashboard)** and select your project.
2. In the left navigation, open **SQL Editor**.
3. Create a **New query**.
4. Paste the contents of `supabase/schema.sql` (or `src/database.sql`) and click **Run**.
5. When you need to add columns, alter constraints, or migrate schema in production without downtime, run the queries in `supabase/update_tables.sql`.

---

## 2. Universal Record Fields (PostgreSQL / Supabase Standard)

Every table in Supabase contains standard fields ensuring **100% backward compatibility with Base44 frontend calls** as well as native Supabase conventions:

| Field | Supabase / PG Type | Description |
|---|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | Universally unique record identifier |
| `created_date` | `TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())` | Base44-compatible creation timestamp |
| `updated_date` | `TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())` | Base44-compatible updated timestamp |
| `created_by_id` | `UUID REFERENCES auth.users(id) DEFAULT auth.uid()` | Creator's Supabase User ID (auto-populated by `auth.uid()`) |
| `created_at` | `TIMESTAMPTZ GENERATED ALWAYS AS (created_date) STORED` | Standard Supabase timestamp alias |
| `updated_at` | `TIMESTAMPTZ GENERATED ALWAYS AS (updated_date) STORED` | Standard Supabase timestamp alias |

Every table includes an automatic PostgreSQL trigger `set_updated_timestamp()` to keep `updated_date` fresh on every `UPDATE`.

---

## 3. Entity & Table Reference Catalog

### 3.1 `profiles` (User / Auth Profile)
*Maps Base44 `User` & Supabase `auth.users`*
- Trigger `handle_new_user()` auto-populates this table upon sign-up.

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | `UUID PRIMARY KEY` | `REFERENCES auth.users(id) ON DELETE CASCADE` | Matches Auth UID |
| `email` | `TEXT` | | User email |
| `full_name` | `TEXT` | | User display name |
| `role` | `TEXT` | `DEFAULT 'user' CHECK (role IN ('admin','user','super_admin','institution_admin','caregiver'))` | System access role |

---

### 3.2 `health_profiles`
*Core medical profile. One per patient (queried via `.eq('created_by_id', user.id)`)*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `full_name` | `TEXT NOT NULL` | | Patient full name |
| `date_of_birth` | `DATE` | | Birthdate |
| `gender` | `TEXT` | `CHECK (gender IN ('male', 'female', 'other'))` | Gender |
| `blood_type` | `TEXT` | `CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'))` | Blood type |
| `height_cm` | `NUMERIC` | | Height in centimeters |
| `weight_kg` | `NUMERIC` | | Weight in kilograms |
| `phone` | `TEXT` | | Phone number |
| `allergies` | `TEXT[]` | `DEFAULT '{}'` | Array of allergies |
| `chronic_conditions` | `TEXT[]` | `DEFAULT '{}'` | Array of chronic conditions |
| `current_medications_text` | `TEXT` | | Free-text medication list |
| `emergency_contacts_json` | `JSONB` | `DEFAULT '[]'` | `[{ name, relationship, phone, tier }]` |
| `language` | `TEXT` | `DEFAULT 'en' CHECK (language IN ('en', 'fr'))` | UI language |
| `care_mode` | `TEXT` | `DEFAULT 'general' CHECK (care_mode IN ('general', 'diabetes', 'hypertension', 'heart_disease'))` | Tailored experience mode |
| `qr_code_id` | `TEXT` | | Emergency QR identifier |
| `avatar_url` | `TEXT` | | Profile avatar URL |
| `checkin_schedule_type` | `TEXT` | `DEFAULT 'monthly' CHECK (checkin_schedule_type IN ('weekly', 'every_x_weeks', 'monthly'))` | Schedule cadence |
| `checkin_week_interval` | `INTEGER` | `DEFAULT 1 CHECK (1-12)` | Cadence multiplier |
| `checkin_enabled` | `BOOLEAN` | `DEFAULT true` | Automated check-ins active |
| `next_checkin_date` | `DATE` | | Due date for next review |
| `last_checkin_completed_at` | `TIMESTAMPTZ` | | Completed timestamp |
| `clinician_override` | `JSONB` | | Doctor customized schedule override |
| `institution_id` | `UUID` | `REFERENCES public.institutions(id)` | Affiliated institution |

---

### 3.3 `health_readings`
*Individual biometric readings (manual entry, voice capture, or wearables)*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `recorded_at` | `TIMESTAMPTZ NOT NULL` | `DEFAULT now()` | Time biometric was recorded |
| `metric_type` | `TEXT NOT NULL` | `CHECK (metric_type IN ('blood_pressure_systolic','blood_pressure_diastolic','glucose','heart_rate','hrv','sleep_hours','steps','weight','spo2','temperature'))` | Type of metric |
| `value` | `NUMERIC NOT NULL` | | Primary numeric value |
| `unit` | `TEXT` | | Measurement unit (mmHg, mg/dL, etc.) |
| `secondary_value` | `NUMERIC` | | Secondary value (e.g. Diastolic BP) |
| `secondary_unit` | `TEXT` | | Secondary unit |
| `source` | `TEXT` | `DEFAULT 'manual' CHECK (source IN ('manual', 'voice', 'google_health', 'apple_health', 'wearable'))` | Data capture channel |
| `ai_interpretation` | `TEXT` | | AI health note |
| `risk_level` | `TEXT` | `DEFAULT 'green' CHECK (risk_level IN ('green', 'amber', 'red'))` | Triage indicator |
| `notes` | `TEXT` | | User notes |

---

### 3.4 `medications`
*Patient medication catalog and dosage regimen*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `name` | `TEXT NOT NULL` | | Medication name |
| `dosage` | `TEXT NOT NULL` | | e.g. "500mg" |
| `frequency` | `TEXT NOT NULL` | | e.g. "Twice daily" |
| `times` | `TEXT[]` | `DEFAULT '{}'` | Array of daily times e.g. `['08:00', '20:00']` |
| `instructions` | `TEXT` | | Meal instructions, warnings |
| `start_date` | `DATE` | | Prescribed start date |
| `end_date` | `DATE` | | Prescription completion date |
| `status` | `TEXT` | `DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed'))` | Course status |
| `color_tag` | `TEXT` | `DEFAULT 'lavender' CHECK (color_tag IN ('lavender', 'mint', 'peach', 'amber'))` | UI card tint |
| `prescribed_by` | `TEXT` | | Prescribing doctor name |
| `refill_date` | `DATE` | | Pharmacy refill deadline |

---

### 3.5 `reminders` & `reminder_logs`
*Active schedule alerts and historical per-dose adherence logs*

#### `reminders`
| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `type` | `TEXT NOT NULL` | `CHECK (type IN ('medication', 'appointment', 'health_routine', 'wellness'))` | Category |
| `title` | `TEXT NOT NULL` | | Reminder title |
| `description` | `TEXT` | | Contextual guidance |
| `scheduled_time` | `TIMESTAMPTZ NOT NULL` | | Exact trigger timestamp |
| `repeat_pattern` | `TEXT` | `CHECK (repeat_pattern IN ('once', 'daily', 'weekly', 'custom'))` | Recurrence |
| `related_medication_id`| `UUID` | `REFERENCES public.medications(id)` | Medication foreign key |
| `related_appointment_id`| `UUID` | | Appointment reference |
| `status` | `TEXT` | `DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'confirmed', 'missed', 'escalated'))` | Status |
| `escalation_level` | `INTEGER` | `DEFAULT 0` | Missed dosage escalation counter |
| `confirmed_at` | `TIMESTAMPTZ` | | Time patient confirmed dose |
| `voice_enabled` | `BOOLEAN` | `DEFAULT true` | Voice audio reminder playback |
| `sms_fallback` | `BOOLEAN` | `DEFAULT true` | Cellular fallback |

#### `reminder_logs`
| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `medication_id` | `UUID` | `REFERENCES public.medications(id)` | Medication |
| `medication_name` | `TEXT NOT NULL` | | Medication name |
| `scheduled_time` | `TIMESTAMPTZ NOT NULL` | | Scheduled dose time |
| `status` | `TEXT` | `DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed', 'snoozed'))` | Adherence state |
| `taken_at` | `TIMESTAMPTZ` | | Actual dose timestamp |
| `escalation_level` | `INTEGER` | `DEFAULT 0` | Escalation step reached |
| `family_notified` | `BOOLEAN` | `DEFAULT false` | Family notification sent |
| `caregiver_alerted` | `BOOLEAN` | `DEFAULT false` | Caregiver emergency ping sent |

---

### 3.6 `appointments`
*Doctor consultations, clinic visits, and follow-ups*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `title` | `TEXT NOT NULL` | | Appointment title |
| `doctor_name` | `TEXT` | | Physician name |
| `specialty` | `TEXT` | | Medical specialty |
| `location` | `TEXT` | | Hospital / Clinic address or Telehealth link |
| `appointment_date` | `TIMESTAMPTZ NOT NULL` | | Consultation time |
| `duration_minutes` | `INTEGER` | `DEFAULT 30` | Expected duration |
| `notes` | `TEXT` | | Pre-visit notes / symptoms |
| `follow_up_notes` | `TEXT` | | Post-visit instructions |
| `attached_document_ids` | `TEXT[]` | `DEFAULT '{}'` | Linked test results / vault IDs |
| `status` | `TEXT` | `DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled', 'missed'))` | State |
| `reminder_sent` | `BOOLEAN` | `DEFAULT false` | Calendar notification status |

---

### 3.7 `emergency_contacts`
*Emergency contact registry with SOS notification tiers*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `name` | `TEXT NOT NULL` | | Contact full name |
| `relationship` | `TEXT` | | e.g. Daughter, Caregiver, Neighbor |
| `phone` | `TEXT NOT NULL` | | Mobile number with country code |
| `tier` | `INTEGER NOT NULL` | `DEFAULT 1 CHECK (tier IN (1, 2))` | 1 = Family/Close, 2 = Medical/Caregiver |
| `is_primary` | `BOOLEAN` | `DEFAULT false` | Primary SOS recipient |
| `whatsapp_enabled` | `BOOLEAN` | `DEFAULT true` | WhatsApp alert channel enabled |

---

### 3.8 `alerts`
*Emergency SOS incidents, fall detection alerts, and critical health changes*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `type` | `TEXT NOT NULL` | `CHECK (type IN ('emergency_sos', 'health_reading', 'inactivity', 'medication_missed', 'fall_detected', 'caregiver_alert', 'health_risk', 'institution_critical'))` | Alert classification |
| `severity` | `TEXT NOT NULL` | `DEFAULT 'amber' CHECK (severity IN ('green', 'amber', 'red'))` | Severity indicator |
| `title` | `TEXT NOT NULL` | | Alert subject |
| `description` | `TEXT` | | Detailed event context |
| `status` | `TEXT` | `DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'snoozed'))` | Workflow state |
| `location_lat` | `NUMERIC` | | Emergency GPS latitude |
| `location_lng` | `NUMERIC` | | Emergency GPS longitude |
| `notified_contacts` | `TEXT[]` | `DEFAULT '{}'` | Contacts pinged |
| `resolved_at` | `TIMESTAMPTZ` | | Time resolved |
| `resolved_by` | `TEXT` | | Responder name |
| `patient_name` | `TEXT` | | Patient name |
| `patient_user_id` | `UUID` | `REFERENCES auth.users(id)` | Patient User ID |
| `voice_url` | `TEXT` | | SOS voice message recording |
| `trigger_source` | `TEXT` | | Button press, accelerometer, vitals trigger |
| `channels_used` | `TEXT[]` | `DEFAULT '{}'` | Channels used (SMS, WhatsApp, Push) |
| `snoozed_until` | `TIMESTAMPTZ` | | Snooze expiration |
| `snoozed_by` | `TEXT` | | User who snoozed |
| `institution_id` | `UUID` | `REFERENCES public.institutions(id)` | Scoped institution |
| `alert_category` | `TEXT` | `CHECK (alert_category IN ('critical_health_change', 'missed_medication', 'concerning_trend'))` | Root trigger |
| `detected_at` | `TIMESTAMPTZ` | | Detection timestamp |

---

### 3.9 `predictions`
*AI health risk scoring, trend patterns, and doctor recommendation digests*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `report_type` | `TEXT NOT NULL` | `CHECK (report_type IN ('weekly', 'risk_assessment', 'compliance', 'trend_analysis'))` | Report type |
| `risk_level` | `TEXT NOT NULL` | `DEFAULT 'green' CHECK (risk_level IN ('green', 'amber', 'red'))` | Overall risk band |
| `risk_score` | `NUMERIC` | `CHECK (0 - 100)` | 0-100 composite risk score |
| `summary` | `TEXT NOT NULL` | | Human-readable AI summary |
| `risk_factors` | `JSONB` | `DEFAULT '[]'` | `[{ factor, level, explanation, weight, trend }]` |
| `recommended_actions` | `TEXT[]`| `DEFAULT '{}'` | Actionable steps |
| `detected_patterns` | `TEXT[]`| `DEFAULT '{}'` | Identified vitals patterns |
| `doctor_report` | `TEXT` | | Formatted clinical memo for doctor |
| `metrics_analyzed`| `TEXT[]` | `DEFAULT '{}'` | Vital sign keys analyzed |
| `period_start` | `DATE` | | Evaluation start date |
| `period_end` | `DATE` | | Evaluation end date |

---

### 3.10 `conversations`
*AI Health Companion conversational memory and triage history*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `title` | `TEXT NOT NULL` | | Session topic |
| `messages` | `JSONB` | `DEFAULT '[]'` | `[{ role, content, timestamp, voice }]` |
| `language` | `TEXT NOT NULL` | `DEFAULT 'en' CHECK (language IN ('en', 'fr'))` | Chat language |
| `context_summary` | `TEXT` | | Rolling session summary |
| `flagged_emergency` | `BOOLEAN` | `DEFAULT false` | AI flagged triage risk |

---

### 3.11 `family_messages`
*Encrypted patient, caregiver, and family communication channel*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `sender_name` | `TEXT NOT NULL` | | Author name |
| `sender_user_id`| `UUID` | `REFERENCES auth.users(id)` | Author User ID |
| `sender_role` | `TEXT NOT NULL` | `DEFAULT 'patient' CHECK (sender_role IN ('patient', 'caregiver', 'tiva'))` | Sender persona |
| `recipient_name`| `TEXT` | | Target recipient name |
| `recipient_user_id`| `UUID` | `REFERENCES auth.users(id)` | Target User ID |
| `content` | `TEXT NOT NULL` | | Message body |
| `message_type` | `TEXT NOT NULL` | `DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image'))` | Format |
| `audio_url` | `TEXT` | | Voice memo audio URL |
| `image_url` | `TEXT` | | Attached picture URL |
| `sent_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Sent timestamp |
| `is_read` | `BOOLEAN` | `DEFAULT false` | Read status |
| `mood_tag` | `TEXT` | `CHECK (mood_tag IN ('happy', 'neutral', 'sad', 'anxious', 'calm'))` | Sentiment tag |
| `patient_user_id`| `UUID` | `REFERENCES auth.users(id)` | Associated patient file |
| `is_private` | `BOOLEAN` | `DEFAULT false` | Private to recipient only |

---

### 3.12 `caregiver_assignments`
*Permission-controlled links between caregivers, institutions, and patients*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `caregiver_user_id` | `UUID` | `REFERENCES auth.users(id)` | Caregiver User ID |
| `caregiver_name` | `TEXT NOT NULL` | | Caregiver full name |
| `caregiver_email` | `TEXT` | | Caregiver email |
| `caregiver_phone` | `TEXT` | | Caregiver phone |
| `patient_user_id` | `UUID` | `REFERENCES auth.users(id)` | Patient User ID |
| `patient_name` | `TEXT NOT NULL` | | Patient name |
| `relationship` | `TEXT` | | e.g. Nurse, Daughter |
| `permission_level` | `TEXT NOT NULL` | `DEFAULT 'view' CHECK (permission_level IN ('view', 'manage_alerts', 'full_access'))` | Access tier |
| `status` | `TEXT NOT NULL` | `DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked'))` | Link state |
| `invite_token` | `TEXT` | | Secure invite verification token |
| `last_sync_at` | `TIMESTAMPTZ` | | Last data review timestamp |
| `notifications_enabled` | `BOOLEAN`| `DEFAULT true` | Push/SMS alerts active |
| `institution_id` | `UUID` | `REFERENCES public.institutions(id)` | Scoped institution |
| `institution_name` | `TEXT` | | Scoped institution name |
| `assignment_type` | `TEXT NOT NULL` | `DEFAULT 'patient_invite' CHECK (assignment_type IN ('patient_invite', 'institution_invite', 'institution_assignment'))` | Onboarding origin |

---

### 3.13 `medical_records` & `medical_documents`
*Medical document vault (lab results, prescriptions, imaging, hospital reports)*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `title` | `TEXT NOT NULL` | | Document headline |
| `document_type` | `TEXT NOT NULL` | `CHECK (document_type IN ('prescription', 'lab_result', 'hospital_report', 'vaccination', 'imaging', 'discharge_summary', 'doctor_note', 'other'))` | Classification |
| `file_url` | `TEXT` | | Supabase Storage URL |
| `file_type` | `TEXT` | `CHECK (file_type IN ('pdf', 'image', 'photo'))` | MIME group |
| `extracted_text`| `TEXT` | | OCR parsed text |
| `ai_summary` | `TEXT` | | Patient-friendly AI breakdown |
| `ai_explanation`| `TEXT` | | Jargon-free explanation |
| `contraindication_warnings` | `TEXT[]` | `DEFAULT '{}'` | Medication conflicts identified |
| `date_of_document` | `DATE` | | Document issue date |
| `issued_by` | `TEXT` | | Clinic / Lab name |
| `tags` | `TEXT[]` | `DEFAULT '{}'` | Search tags |

---

### 3.14 `memory_notes` & `wellness_entries`
*Cognitive brain exercises, voice journals, tasks, and daily wellness logs*

#### `memory_notes`
- Note Types: `'voice_note'`, `'text_note'`, `'brain_exercise'`, `'task'`, `'journal'`
- Brain Exercise Types: `'memory_match'`, `'word_recall'`, `'number_sequence'`, `'story_quiz'`
- Score: `exercise_score INTEGER`

#### `wellness_entries`
- Entry Types: `'mood'`, `'exercise'`, `'nutrition'`, `'hydration'`, `'mental_check'`, `'brain_exercise'`, `'voice_note'`, `'journal'`
- Score: `mood_score NUMERIC (1–5)`

---

### 3.15 `subscriptions`
*Patient billing plans (Free Trial, Monthly, Biannual, Annual, MTN MoMo, Orange Money, Card)*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `plan` | `TEXT NOT NULL` | `DEFAULT 'free_trial' CHECK (plan IN ('free_trial', 'monthly', 'biannual', 'annual'))` | Plan tier |
| `status` | `TEXT NOT NULL` | `DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'grace_period'))` | Subscription state |
| `start_date` | `DATE` | | Active start |
| `end_date` | `DATE` | | Renewal deadline |
| `payment_method` | `TEXT NOT NULL`| `DEFAULT 'none' CHECK (payment_method IN ('mtn_momo', 'orange_money', 'card', 'none'))` | Payment rail |
| `payment_phone` | `TEXT` | | Mobile money number |
| `amount` | `NUMERIC` | | Price charged |
| `currency` | `TEXT NOT NULL` | `DEFAULT 'XAF'` | Currency code |
| `auto_renew` | `BOOLEAN` | `DEFAULT true` | Automatic renewal active |
| `trial_days_remaining`| `NUMERIC`| | Trial counter |

---

### 3.16 `institutions` & `institution_admin_invites`
*Healthcare provider organization accounts (Hospitals, Clinics, Care Homes)*

#### `institutions`
- Types: `'hospital'`, `'clinic'`, `'care_home'`, `'insurance'`, `'home_care'`
- Statuses: `'active'`, `'suspended'`, `'pending'`
- Billing: `'monthly'`, `'quarterly'`, `'annual'`
- Admin fields: `admin_user_id`, `admin_name`, `additional_admin_ids TEXT[]`, `patient_count INTEGER`

#### `institution_admin_invites`
- Statuses: `'pending'`, `'accepted'`, `'revoked'`
- Scoped to: `institution_id` with secure `invite_token`

---

### 3.17 `check_in_observations`
*Structured periodic health check-in observations*

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `systolic_bp` | `INTEGER NOT NULL` | `CHECK (60 - 250)` | Systolic reading |
| `diastolic_bp` | `INTEGER NOT NULL` | `CHECK (40 - 150)` | Diastolic reading |
| `weight_kg` | `NUMERIC NOT NULL` | `CHECK (20 - 300)` | Weight in kg |
| `heart_rate` | `INTEGER` | `CHECK (30 - 200)` | BPM |
| `heart_rate_capture_method` | `TEXT` | `CHECK (heart_rate_capture_method IN ('camera-high', 'camera-medium', 'manual'))` | Capture sensor |
| `wellness_score` | `INTEGER NOT NULL` | `CHECK (1 - 5)` | Overall wellness rating |
| `check_in_type` | `TEXT NOT NULL` | `DEFAULT 'patient_initiated' CHECK (check_in_type IN ('scheduled', 'patient_initiated'))` | Source |
| `submitted_at` | `TIMESTAMPTZ NOT NULL`| `DEFAULT now()` | Time submitted |
| `critical_alert_triggered` | `BOOLEAN` | `DEFAULT false` | Immediate alert raised |

---

### 3.18 `clinical_notes`
*Internal clinical notes left by doctors, institution admins, and caregivers on a patient file.*
> **Privacy Rule**: Visible *only* to institution staff and assigned caregivers. Strictly blocked from patient view.

- Note Categories: `'general'`, `'clinical_observation'`, `'medication_review'`, `'care_plan'`, `'follow_up'`, `'behavioral'`
- Pinning: `is_pinned BOOLEAN DEFAULT false` (pinned notes stay on top)

---

### 3.19 `care_tasks`
*Care plan tasks assigned to caregivers or patients with priority and due date tracking*

- Statuses: `'pending'`, `'in_progress'`, `'completed'`
- Priorities: `'low'`, `'medium'`, `'high'`
- References: `patient_user_id`, `assigned_to_user_id`, `assigned_by_user_id`, `institution_id`

---

### 3.20 `audit_logs`
*System audit trail for security, medical data access, and regulatory compliance*

- Severities: `'info'`, `'warning'`, `'critical'`
- Fields: `action`, `actor_id`, `actor_name`, `actor_role`, `entity_affected`, `entity_id`, `details`, `ip_address`, `institution_id`

---

## 4. Master Schema SQL Code (Create Tables)

The complete SQL code is saved in [`supabase/schema.sql`](file:///c:/Users/ELDAD/Downloads/Tiva_Companion_Base_44-main/Tiva_Companion_Base_44-main/supabase/schema.sql) and [`src/database.sql`](file:///c:/Users/ELDAD/Downloads/Tiva_Companion_Base_44-main/Tiva_Companion_Base_44-main/src/database.sql).

Below is the SQL code ready to copy and paste into the Supabase SQL Editor:

```sql
-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TRIGGER FUNCTION FOR UPDATED TIMESTAMP
CREATE OR REPLACE FUNCTION public.set_updated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. PROFILES
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

-- Sync auth.users -> public.profiles
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

DROP TRIGGER IF EXISTS set_profiles_updated_date ON public.profiles;
CREATE TRIGGER set_profiles_updated_date
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_timestamp();

-- 4. INSTITUTIONS
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

-- 5. HEALTH PROFILES
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

-- 6. HEALTH READINGS
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

-- 7. MEDICATIONS
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

-- 8. REMINDERS
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

-- 9. REMINDER LOGS
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

-- 10. APPOINTMENTS
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

-- 11. EMERGENCY CONTACTS
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

-- 12. ALERTS
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

-- 13. PREDICTIONS
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

-- 14. CONVERSATIONS
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

-- 15. FAMILY MESSAGES
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

-- 16. CAREGIVER ASSIGNMENTS
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

-- 17. MEDICAL RECORDS
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

-- 18. MEDICAL DOCUMENTS
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

-- 19. MEMORY NOTES
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

-- 20. WELLNESS ENTRIES
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

-- 21. SUBSCRIPTIONS
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

-- 22. AUDIT LOGS
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

-- 23. CHECK-IN OBSERVATIONS
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

-- 24. CLINICAL NOTES
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

-- 25. CARE TASKS
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

-- 26. INSTITUTION ADMIN INVITES
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
```

---

## 5. SQL Code Required to Update & Alter Tables (Migrations)

Whenever requirements change in your application, execute migrations using standard PostgreSQL DDL commands. The dedicated migration file is located in [`supabase/update_tables.sql`](file:///c:/Users/ELDAD/Downloads/Tiva_Companion_Base_44-main/Tiva_Companion_Base_44-main/supabase/update_tables.sql).

### 5.1 Adding Columns Safely
```sql
ALTER TABLE public.health_readings 
ADD COLUMN IF NOT EXISTS is_fasting BOOLEAN DEFAULT false;

ALTER TABLE public.health_profiles 
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
```

### 5.2 Modifying Column Types or Defaults
```sql
ALTER TABLE public.health_readings 
ALTER COLUMN value TYPE NUMERIC(8,2) USING value::NUMERIC(8,2);

ALTER TABLE public.reminders 
ALTER COLUMN escalation_level SET DEFAULT 0;
```

### 5.3 Updating Enum / CHECK Constraints
```sql
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'health_readings_metric_type_check'
    ) THEN
        ALTER TABLE public.health_readings DROP CONSTRAINT health_readings_metric_type_check;
    END IF;
    
    ALTER TABLE public.health_readings ADD CONSTRAINT health_readings_metric_type_check CHECK (
        metric_type IN (
            'blood_pressure_systolic', 'blood_pressure_diastolic', 'glucose',
            'heart_rate', 'hrv', 'sleep_hours', 'steps', 'weight', 'spo2',
            'temperature', 'respiratory_rate', 'ecg'
        )
    );
END $$;
```

### 5.4 Creating or Updating Row Level Security (RLS) Policies
```sql
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
```

---

## 6. Supabase Client Integration

Install `@supabase/supabase-js` (already installed in `package.json`).

Create your environment file `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
```

And initialize the client in `src/lib/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
```