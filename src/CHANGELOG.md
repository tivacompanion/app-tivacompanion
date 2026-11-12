# Tiva — Change Log

A chronological record of changes made to the Tiva Health Companion platform.

---

## [Unreleased]

### Added
- **Customizable alert notification sounds** for the Institution Admin Portal. Staff can configure per-severity (Red / Amber / Green) sound profiles — frequency, volume, and vibration pattern — via the `AlertSoundSettingsModal`. Settings persist locally (`useAlertSoundSettings` hook) and the `useInstitutionAlertSound` hook generates distinct Web Audio tones (urgent triple-beep for red, double-tone for amber, gentle chime for green). The `CriticalAlertsPanel` includes a gear-icon settings button and a test button per severity level.
- **Quick-action call & message buttons** in the Institution Patient Detail view (`PatientQuickActions` component). Caregivers can call or message the patient and their family/emergency contacts directly without leaving the dashboard — uses `tel:` links for calls and creates `FamilyMessage` records for in-app messages.
- **Monthly Check-In Scheduler** backend function (`monthlyCheckInScheduler`) — automatically generates scheduled check-ins based on each patient's configured frequency (weekly, every X weeks, or monthly).
- **Clinician override for check-in frequency** — clinicians can set custom check-in schedules per patient via the `clinicianOverrideCheckin` backend function, stored as `clinician_override` on `HealthProfile`.
- **Vital trend detector** backend function (`vitalTrendDetector`) — analyses health readings and generates trend-based alerts.
- **Institution alert scanner** backend function (`institutionAlertScanner`) — periodically scans for critical alerts across institution patients.
- **Danger reading caregiver notification** (`notifyCaregiverDangerReading`) — automatically notifies caregivers when a patient logs a dangerous health reading.
- **Appointment reminder sender** (`sendAppointmentReminders`) — sends reminders for upcoming appointments.
- **Institution report export** (`exportInstitutionReport`) — generates downloadable PDF/CSV reports for institutions.
- **Unified auth redirect** — a `/auth-redirect` route evaluates user role (admin / caregiver / patient) post-login and routes to the correct dashboard, replacing redundant login pages.
- **Institution login page** (`/institution-login`) — dedicated admin-only login with role enforcement.
- **Request Institution page** (`/request-institution`) — public form for healthcare providers to request platform access.
- **Accept Institution Invite** page — onboarding flow for invited institution admins.
- **Institution Reports page** — analytics dashboard with engagement metrics, clinical stats, and audit logs.
- **Priority Triage panel** — severity-sorted patient triage view in the Institution Portal.
- **Remote Monitoring panel** — real-time patient vitals monitoring for institution staff.
- **Patient Search Bar** — quick patient lookup in the Institution Portal.
- **Bulk Manage modal** — batch assign/remove caregivers across multiple patients.
- **Assign / Reassign Patient modals** — manage caregiver-patient assignments.
- **Activity Log panel** — chronological audit trail per institution.
- **CheckInObservation entity** — structured monthly check-in data (BP, weight, heart rate, wellness score, capture method).
- **ClinicalNote entity** — internal clinical notes for care coordination. Visible only to institution staff and assigned caregivers; supports categories (general, clinical observation, medication review, care plan, follow-up, behavioral) and pinning. Integrated into both Institution Patient Detail and Caregiver Dashboard via `ClinicalNotesPanel`.
- **HealthProfile check-in fields** — `checkin_schedule_type`, `checkin_week_interval`, `checkin_enabled`, `next_checkin_date`, `last_checkin_completed_at`, `clinician_override`.
- **Institution fields** — `admin_name`, `approval_token`, `rejection_reason`.
- **Alert fields** — `patient_name`, `patient_user_id`, `voice_url`, `trigger_source`, `channels_used`, `snoozed_until`, `snoozed_by`, `institution_id`, `alert_category`, `detected_at`.
- **CaregiverAssignment fields** — `caregiver_phone`, `institution_id`, `institution_name`, `assignment_type`.
- **AuditLog field** — `institution_id`.
- **FamilyMessage fields** — `sender_user_id`, `recipient_user_id`, `patient_user_id`, `is_private`.
- **CheckInFrequencySettings component** — UI for clinicians to override patient check-in schedules.
- **MonthlyCheckIn multi-step flow** — BloodPressure, Weight, HeartRate (camera/manual), WellnessScore, and Summary steps.
- **OfflineCheckInSync component** — caches check-in data for offline submission.

### Changed
- **Institution Portal** now has five tabs: Triage, Monitoring, Caregivers, Patients, and Activity Log — replacing the previous two-tab layout.
- **CriticalAlertsPanel** now polls every 60 seconds and plays configurable alert sounds when new alerts arrive.
- **InstitutionPatientDetail** now includes quick-action buttons for calling/messaging patients and family contacts.
- **Auth flow** consolidated into a single entry point with role-based redirect (`PostLoginRedirect` component at `/auth-redirect`).
- **OnboardingGuard** wraps all authenticated routes to ensure profile completion before access.

### Earlier
- **Voice-activated SOS via wake word.** Saying "Tiva help emergency", "Tiva emergency", or "Tiva SOS" now triggers the full SOS protocol automatically — logging an Alert, SMS-ing personal contacts and local emergency services, messaging assigned caregivers, and showing a persistent (sticky) browser notification.
- **Local Emergency Services tier.** Emergency contacts now support a "Local Emergency Service" category (ambulance / police / fire). These contacts receive a dedicated SMS with the user's location, blood type, and chronic conditions during an SOS.
- **Shared SOS trigger utility** (`utils/sosTrigger.js`) — single source of truth for the SOS flow, reused by both the Emergency page button and the wake-word listener.
- **Wake-word listener** (`components/WakeWordListener.jsx`) — hands-free "Hey Tiva" activation that opens the AI chat, with opt-in toggle in Settings.
- **Persistent notification** on SOS using `requireInteraction: true` and `renotify: true`.

### Changed
- Emergency page contact form now offers three tiers: Family (Tier 1), Caregiver (Tier 2), and Local Emergency Service.
- Emergency page contact list separates personal contacts from local services with distinct visual styling.
- SOS trigger logic on the Emergency page now delegates to the shared `triggerSOS` utility instead of inline implementation.

---

## [Earlier Releases]

### Added
- **Daily Check-In** flow with LLM-powered health extraction and wellness logging.
- **Predictive Care** dashboard with AI risk assessments, trend analysis, and auto-generated alerts for red-level risks.
- **Medication Reminder Manager** with browser notifications, voice cues, and 30-second polling.
- **Family / Caregiver** messaging hub with real-time subscriptions and caregiver invitations.
- **Medical Vault** with document upload, AI summaries, and QR card.
- **Subscription** management with MTN MoMo / Orange Money / card payment methods.
- **Institution Portal** for B2B healthcare providers.
- **Memory** module with brain exercises and voice notes.
- **Wellness** tracking (mood, exercise, nutrition, hydration, mental check-ins).
- Core entities: HealthProfile, HealthReading, Medication, Appointment, EmergencyContact, Alert, Prediction, Reminder, Conversation, FamilyMessage, CaregiverAssignment, MedicalRecord, MedicalDocument, MemoryNote, WellnessEntry, Subscription, Institution, AuditLog, ReminderLog.
- Brand design system: dark teal canvas, glassmorphism cards, Plus Jakarta Sans / Inter typography.