# Tiva — Handover Log

Project handover notes for developers taking over maintenance or extension of the Tiva Health Companion platform.

---

## 1. Project Overview

**Tiva** is a voice-first health companion app for patients (with a focus on elderly and chronic-condition users in West/Central Africa). It provides AI chat, medication reminders, health tracking, predictive risk analysis, emergency SOS, family/caregiver coordination, and a B2B institution portal.

- **Stack:** React + Vite + Tailwind CSS + shadcn/ui, Supabase (Auth, PostgreSQL DB, Storage, Edge Functions).
- **Design system:** Dark teal canvas (`#0A0F0D`), glassmorphism cards, mint/teal accents (`#40C9A2`), Plus Jakarta Sans (headings) + Inter (body). Tokens live in `index.css`; mappings in `tailwind.config.js`.
- **Auth:** Supabase Auth (email/password, Google OAuth, OTP). Pages: `Login`, `Register`, `ForgotPassword`, `ResetPassword`. Protected routes via `ProtectedRoute`.

---

## 2. Architecture

```
App.jsx                    → Router, AuthProvider, QueryClientProvider, Toaster
components/AppLayout.jsx   → Global layout (sidebar + mobile nav + bottom nav)
                            Wraps every page. Hosts MedicationReminderManager + WakeWordListener.
components/PostLoginRedirect→ /auth-redirect route: evaluates user role (admin/caregiver/patient)
                            and redirects to the correct dashboard post-login.
components/OnboardingGuard → Wraps all authenticated routes; ensures HealthProfile is complete
                            before granting access to the main app.
components/RoleGuard       → Route-level access control (role="admin" / "caregiver").
pages/                     → One file per route (Home, Chat, Medications, HealthTracking, etc.)
components/                → Reusable UI + feature components
components/ui/             → shadcn/ui primitives (button, dialog, input, select, …)
components/ui/primitives   → Tiva-specific shared UI: RiskBadge, StatCard, SectionHeader,
                            EmptyState, LoadingState.
components/institution/    → Institution Portal components (admin view, caregiver modals,
                            alerts panel, triage, monitoring, quick actions, reports).
components/caregiver/      → Caregiver dashboard components (summary, message panel).
components/vault/          → Medical vault components (upload, QR card, appointment tabs).
components/monthlyCheckIn/ → Multi-step monthly check-in flow (BP, weight, HR, wellness, summary).
supabase/schema.sql        → Full Supabase PostgreSQL schema and RLS policies
src/api/tivaClient.js      → Supabase entity & API client adapter
hooks/                     → useVoice, use-mobile, useAlertSoundSettings, useInstitutionAlertSound,
                            useAlarmSound
utils/                     → Helpers (tts, smsAlerts, sosTrigger)
lib/                       → AuthContext, query-client, utils, PageNotFound, LanguageContext
```

### Key shared components
- `AppLayout` — wraps every authenticated page; renders sidebar, mobile header/drawer, bottom nav, and global listeners.
- `PostLoginRedirect` — at `/auth-redirect`; calls `base44.auth.me()` and role-check functions to route admins → `/institution`, caregivers → `/caregiver`, patients → `/`.
- `OnboardingGuard` — layout route wrapping all main app routes; redirects to `/onboarding` if HealthProfile is incomplete.
- `RoleGuard` — layout route for role-specific pages (admin, caregiver); checks role via backend and redirects unauthorized users.
- `MedicationReminderManager` — polls pending reminders every 30s, fires browser + voice alerts.
- `WakeWordListener` — continuous SpeechRecognition; "Hey Tiva" → opens chat; emergency phrases → triggers SOS.
- `DailyCheckIn` — periodic wellness survey with LLM extraction.
- `MonthlyCheckIn` — multi-step check-in flow (BP → Weight → HeartRate → WellnessScore → Summary); submits via `submitMonthlyCheckIn` backend function.

### Institution Portal components (`components/institution/`)
- `InstitutionAdminView` — main admin interface with 5 tabs: Triage, Monitoring, Caregivers, Patients, Activity Log.
- `SuperAdminView` — platform-wide admin view for managing all institutions.
- `CriticalAlertsPanel` — polls critical alerts every 60s; plays configurable sound on new alerts; gear icon opens `AlertSoundSettingsModal`.
- `AlertSoundSettingsModal` — per-severity (Red/Amber/Green) sound configuration: frequency, volume, vibration pattern, test button.
- `PriorityTriagePanel` — severity-sorted patient triage view.
- `RemoteMonitoringPanel` — real-time patient vitals monitoring.
- `PatientQuickActions` — call/message buttons for patient + family contacts in patient detail view.
- `ActivityLogPanel` — chronological audit trail per institution.
- `PatientSearchBar`, `BulkManageModal`, `AssignPatientModal`, `ReassignPatientModal`, `InviteCaregiverModal`.

### Key utilities
- `utils/sosTrigger.js` — `triggerSOS({ source, phrase })`: geolocation, SMS to personal + local-service contacts, caregiver FamilyMessage, Alert creation, persistent notification. **Reuse this for any new SOS entry point.**
- `utils/smsAlerts.js` — `sendEmergencySMS`, `buildSOSMessage`, `buildVitalsAlertMessage`.
- `utils/tts.js` — `speak(text)` browser TTS wrapper.

### Key hooks
- `useAlertSoundSettings` — reads/writes per-severity sound settings (frequency, volume, vibration) from `localStorage`.
- `useInstitutionAlertSound` — generates Web Audio tones based on severity; uses settings from the above hook.
- `useAlarmSound` — generic alarm sound generator for critical alerts.
- `useVoice` — speech-to-text + audio recorder.

---

## 3. Entities (Database)

See `DATABASE.md` for the full schema reference. Built-in fields on every record: `id`, `created_date`, `updated_date`, `created_by_id`.

User entity is built-in (read-only: id, created_date, full_name, email; editable: role). Users join via invites (`base44.users.inviteUser`).

---

## 4. Backend Functions

All functions live in `base44/functions/{functionName}/entry.ts` and use `Deno.serve` + `createClientFromRequest(req)`.

| Function | Purpose |
|---|---|
| `caregiverInvite` | Handles caregiver invitation flow (patient-side and institution-side). |
| `caregiverPortal` | Caregiver dashboard data: assigned patients, health trends, alerts, messaging. |
| `clinicianOverrideCheckin` | Clinician sets custom check-in frequency for a patient (stored as `clinician_override` on HealthProfile). |
| `emergencySnapshot` | Public endpoint for QR-code emergency snapshot (no auth; reads HealthProfile by `qr_code_id`). |
| `exportInstitutionReport` | Generates downloadable PDF/CSV institution reports. |
| `institutionAlertScanner` | Scheduled: scans for critical alerts across institution patients. |
| `institutionPortal` | Main institution backend: dashboard data, caregiver/patient management, assignments, bulk ops, critical alerts, reports, audit logs. |
| `monthlyCheckInScheduler` | Scheduled: generates check-in schedules based on patient frequency settings. |
| `notifyCaregiverDangerReading` | Notifies caregivers when a patient logs a dangerous health reading. |
| `sendAppointmentReminders` | Sends reminders for upcoming appointments. |
| `submitMonthlyCheckIn` | Validates and stores a monthly check-in submission (creates CheckInObservation + Alert if critical). |
| `vitalTrendDetector` | Analyses health readings and generates trend-based alerts. |

**Clinical Notes:** Both `institutionPortal` (actions: `get_clinical_notes`, `add_clinical_note`, `delete_clinical_note`, `toggle_pin_clinical_note`) and `caregiverPortal` (same actions) support internal clinical notes. Notes are scoped by `institution_id` and `patient_user_id`. Institution admins can delete any note; caregivers can only delete their own. The `ClinicalNotesPanel` component (`components/institution/ClinicalNotesPanel.jsx`) is reused in both the Institution Patient Detail and Caregiver Dashboard — pass `source="institution"` or `source="caregiver"` to route API calls to the correct backend function.

**Adding new functions:** follow the Base44 backend function guidelines (Deno.serve, createClientFromRequest, Response.json, try/catch). Admin-only functions must verify `user.role === 'admin'`.

---

## 5. Integrations

Available via `base44.integrations.Core`:
- `InvokeLLM` — LLM calls (default automatic; optional `model`, `add_context_from_internet`, `response_json_schema`, `file_urls`).
- `UploadFile` / `UploadPrivateFile` / `CreateFileSignedUrl` — file storage.
- `ExtractDataFromUploadedFile` — structured extraction from PDFs/images/CSV.
- `SendEmail`, `GenerateImage`, `GenerateSpeech`, `GenerateVideo`, `TranscribeAudio`.

No OAuth app connectors are currently authorized.

---

## 6. Emergency / SOS Flow (critical path)

1. Trigger sources: Emergency page button, wake-word emergency phrases.
2. `triggerSOS()` (in `utils/sosTrigger.js`):
   - Fetches HealthProfile + geolocation.
   - Splits contacts into personal (family/caregiver) and local services.
   - Sends SMS via `sendEmergencySMS` (opens native SMS app with pre-filled body).
   - Creates an `Alert` record (type `emergency_sos`, severity `red`).
   - Sends FamilyMessage to each active CaregiverAssignment.
   - Shows a persistent browser Notification (`requireInteraction: true`).
3. User is navigated to `/emergency`.

**When extending SOS:** always call `triggerSOS()` — do not re-implement the flow inline.

---

## 7. Voice / Wake-Word

- `WakeWordListener` is mounted globally in `AppLayout`.
- Enabled/disabled via `localStorage.wakeWordEnabled` + a Settings toggle; toggles dispatch a `wakeWordToggle` event.
- Wake words: "hey tiva", "hi tiva", "ok tiva", "okay tiva", "tiva help" → navigate to `/chat`.
- Emergency phrases: "tiva help emergency", "tiva emergency", "tiva sos", etc. → trigger SOS.
- Requires HTTPS + microphone permission. Falls back gracefully on unsupported browsers.

---

## 8. Conventions

- Every page/component is a default export matching its filename.
- Styling: Tailwind token classes (`bg-card`, `text-navy`, `bg-mint`, etc.); no hardcoded hex in JSX.
- Icons: `lucide-react` only.
- Entity SDK: `base44.entities.<Name>.list/filter/create/update/delete/...`.
- Realtime: `base44.entities.<Name>.subscribe(callback)`.
- Auth: `base44.auth.me()`, `isAuthenticated()`, `logout()`, `updateMe()`.

---

## 9. Known Limitations / Notes

- SMS sending opens the native SMS app (no carrier API); works on mobile, limited on desktop.
- Wake-word requires browser SpeechRecognition support (Chrome/Edge best).
- No payment integration is currently installed; Subscription page is UI-only. Stripe is available for the CM region if payments are needed.
- Alert sound settings are stored in `localStorage` (per-device), not synced across devices.
- Predictive Care alerts are generated client-side via InvokeLLM — not a medical device.
- Institution alert scanning and monthly check-in scheduling rely on scheduled automations; verify they are active in the dashboard.

---

## 10. Auth & Routing Flow

1. User logs in via `/login` (email/password or Google OAuth) or `/institution-login` (admin-only).
2. On success, user is redirected to `/auth-redirect` → `PostLoginRedirect` component.
3. `PostLoginRedirect` calls `base44.auth.me()` and role-check functions:
   - Admin → `/institution`
   - Caregiver → `/caregiver`
   - Patient → `/` (Home)
4. All authenticated routes are wrapped in `ProtectedRoute` (auth check) → `OnboardingGuard` (profile check).
5. Role-specific routes use `RoleGuard` (admin, caregiver).
6. Public routes (no auth): `/login`, `/register`, `/forgot-password`, `/reset-password`, `/institution-login`, `/request-institution`, `/emergency-snapshot/:qrCodeId`, `/accept-institution-invite`.

---

## 11. Getting Started for New Developers

1. Read `CHANGELOG.md` for recent changes.
2. Read `DATABASE.md` for the entity schema.
3. Skim `App.jsx` routes and `components/AppLayout.jsx`.
4. Review `utils/sosTrigger.js` and `components/WakeWordListener.jsx` for the emergency flow.
5. Check `pages/Home.jsx` for the dashboard pattern (data loading, AppLayout usage, primitives).
6. For institution portal work, read `base44/functions/institutionPortal/entry.ts` and `components/institution/InstitutionAdminView.jsx`.
7. For check-in flow, read `components/MonthlyCheckIn.jsx` and `base44/functions/submitMonthlyCheckIn/entry.ts`.
8. For alert sounds, read `hooks/useAlertSoundSettings.js` and `hooks/useInstitutionAlertSound.js`.