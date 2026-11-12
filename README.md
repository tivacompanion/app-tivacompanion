# 🌿 Tiva Health Companion

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-94%20passed%20%7C%200%20failed-success.svg)]()
[![Engine](https://img.shields.io/badge/engine-Supabase%20(PostgreSQL)-blue.svg)]()
[![Base44](https://img.shields.io/badge/Base44%20Dependency-0%25%20(Completely%20Decoupled)-success.svg)]()
[![Platform](https://img.shields.io/badge/platform-PWA%20%7C%20Mobile%20%7C%20Web-orange.svg)]()
[![Security](https://img.shields.io/badge/security-Hardened%20RLS%20%2B%20Anti--Escalation-teal.svg)]()

> **Tiva** is an AI-powered predictive healthcare companion, remote patient monitoring (RPM) system, and clinical triage platform designed for patients, families, professional caregivers, and healthcare institutions. 
> 
> Originally prototyped on Base44, the platform has been **100% decoupled and migrated to a native, self-sovereign Supabase (PostgreSQL) architecture** with zero external platform dependencies.

---

## 📑 Table of Contents

1. [Architecture & Base44 Migration](#-architecture--base44-migration)
2. [User Personas & Access Portals](#-user-personas--access-portals)
   - [Patient / Individual](#1-patient--individual-role-user-or-patient)
   - [Caregiver & Family](#2-caregiver--family-role-caregiver)
   - [Healthcare Institution Admin](#3-healthcare-institution-admin-role-institution_admin-or-admin)
   - [Platform Super Admin](#4-platform-super-admin-role-super_admin)
   - [First Responder & Paramedic (Public)](#5-first-responder--paramedic-public-unauthenticated)
3. [Device Detection & Responsive Gating](#-device-detection--responsive-gating)
4. [Security & Anti-Leakage Architecture](#-security--anti-leakage-architecture)
5. [Hardware & Peripheral Connectivity (Web Bluetooth BLE)](#-hardware--peripheral-connectivity-web-bluetooth-ble)
6. [Database Schema & Migrations](#-database-schema--migrations)
7. [LRU Caching Engine & Clinical Safety](#-lru-caching-engine--clinical-safety)
8. [Installation & Setup](#-installation--setup)
9. [Available Scripts & Quality Assurance](#-available-scripts--quality-assurance)
10. [Comprehensive Testing Scorecard](#-comprehensive-testing-scorecard)

---

## 🏛 Architecture & Base44 Migration

The application was completely refactored to eliminate all dependencies on the proprietary Base44 SDK and cloud. All database queries, authentication flows, file storage, and edge functions execute natively on **Supabase (PostgreSQL 15+)**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIVA CLIENT APPLICATION                         │
│   React 18 + Vite + Tailwind CSS + Lucide + Recharts + PWA Offline SW │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   src/api/tivaClient │
                         │ (Supabase PG Facade)│
                         └──────────┬──────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
┌──────────▼──────────┐  ┌──────────▼──────────┐  ┌──────────▼──────────┐
│   PostgreSQL RLS    │  │   Supabase Auth     │  │   Supabase Storage  │
│  24 Schema Tables   │  │  JWT Sessions, OTP  │  │  medical-vault,     │
│  Audit Triggers     │  │  Password Resets    │  │  avatars, voice     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Key Migration Milestones:
- **Zero Base44 SDK Imports:** Replaced `@base44/sdk` with native `@supabase/supabase-js`.
- **Dynamic Entity Handler Proxy:** `src/api/tivaClient.js` provides dynamic CRUD proxies (`entities.<Entity>.list()`, `filter()`, `create()`, `update()`, `delete()`, `subscribe()`) that automatically translate PascalCase entity names to PostgreSQL `snake_case` tables.
- **Client-Side Edge Function Fallbacks:** Critical functions (`emergencySnapshot`, `submitMonthlyCheckIn`, `predictiveAnalysis`, `caregiverPortal`, `institutionPortal`, `syncWearableData`) run locally against Supabase with full schema verification if Supabase Edge Functions are offline.
- **Backward-Compatible Facade:** `src/api/base44Client.js` transparently re-exports the native Supabase `tivaClient`, allowing existing UI components to operate seamlessly without regressions.

---

## 👥 User Personas & Access Portals

Tiva provides tailored, role-governed user experiences across 5 distinct personas:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                               USER PERSONA MATRIX                             │
├──────────────────────┬───────────────────────┬────────────────────────────────┤
│ Persona              │ Role Identifier       │ Primary Entrypoint & Features  │
├──────────────────────┼───────────────────────┼────────────────────────────────┤
│ Patient              │ user / patient        │ / (Mobile Home, AI Chat, Vitals)│
│ Caregiver / Family   │ caregiver             │ /caregiver (Triage, Alerts, PM)│
│ Institution Admin    │ institution_admin     │ /institution (Facility Roster) │
│ Platform Super Admin │ super_admin           │ /institution (Approvals, Global)│
│ First Responder      │ public / anon         │ /emergency-snapshot/:qrCodeId  │
└──────────────────────┴───────────────────────┴────────────────────────────────┘
```

### 1. Patient / Individual (`role: 'user'` or `'patient'`)
- **Target Device:** Mobile-first PWA (with desktop override support).
- **Primary Routes:**
  - `/`: Personalized biometric dashboard, today's schedule, wellness score.
  - `/chat`: Empathic, proactive AI health companion conversational interface.
  - `/medications`: Dose logging, adherence stats, and scheduled reminders.
  - `/health`: Telemetry tracking (blood pressure, glucose, heart rate, SpO2, sleep, temperature) with Recharts trends.
  - `/vault`: Encrypted clinical repository for lab reports, prescriptions, discharge summaries, and AI document extraction.
  - `/emergency`: 10-second countdown distress trigger with live GPS coordinates and local emergency services dispatch.
  - `/messages`: Private and group care circle communications with voice notes and photo uploads.
  - `/wallpaper`: Emergency lock-screen wallpaper generator embedding medical QR cards.

### 2. Caregiver & Family (`role: 'caregiver'`)
- **Access Route:** `/caregiver`
- **Capabilities:**
  - **Patient Triage Board:** Real-time Red / Amber / Green stratification based on vitals anomalies and missed medication thresholds.
  - **Vital Override & Check-in Scheduling:** Clinician-level frequency controls (weekly, bi-weekly, monthly check-in intervals).
  - **Active Alert Management:** Instant review, acknowledgment, and resolution of emergency SOS, high vitals, and fall detections.
  - **Clinical Notes & Tasks:** Create, pin, prioritize, and assign care tasks and clinical observations.
  - **Private Patient Messaging:** Direct one-on-one encrypted chat channel separate from the broader family circle.

### 3. Healthcare Institution Admin (`role: 'institution_admin'` or `'admin'`)
- **Access Route:** `/institution-login` ➔ `/institution`
- **Target Device:** Desktop web portal (optimized for clinics, hospitals, and assisted-living facilities).
- **Capabilities:**
  - **Facility Roster & Staff Management:** Invite, onboard, activate, or revoke caregiver accounts.
  - **Patient Cohort Reassignment:** Dynamically allocate and balance patient caseloads across care teams.
  - **Longitudinal Drilldown (`/institution/patient/:patientId`):** Complete historical medical timeline, vitals trends, medication adherence, and uploaded vault documents.
  - **Institutional Compliance Reports (`/institution/reports`):** 6-month aggregate clinical trend charts, risk distributions, and one-click downloadable **PDF Compliance Reports** via `jspdf`.
  - **Facility Broadcasts:** Send urgent health alerts or scheduling announcements across all patients under the facility.

### 4. Platform Super Admin (`role: 'super_admin'`)
- **Access Route:** `/institution` (automatically switches to `SuperAdminView`).
- **Capabilities:**
  - **Facility Onboarding Approvals:** Review and approve/reject pending healthcare provider applications submitted via `/request-institution`.
  - **Global Telemetry:** High-level platform metrics across all tenant organizations, active caregivers, and registered patients.
  - **Multi-Tenant Administration:** Provision and configure custom tier quotas and subscriptions.

### 5. First Responder & Paramedic (Public / Unauthenticated)
- **Access Route:** `/emergency-snapshot/:qrCodeId`
- **Capabilities:**
  - Zero-login, instant emergency card lookup triggered by scanning patient's lock-screen QR wallpaper or physical card.
  - Displays essential life-saving data: Blood type, allergies, chronic conditions, active medications, emergency contacts, height, and weight.
  - **Security Guarantee:** Internal auth IDs, user tokens, passwords, and private clinical notes are completely omitted from the database projection.

---

## 📱 Device Detection & Responsive Gating

To provide role-appropriate interfaces while maintaining desktop accessibility for testing and administration:

1. **Detection Engine (`src/utils/deviceDetect.js`):**
   - Combines user-agent sniffing (`Android|iPhone|iPad|...`) with media queries (`max-width: 767px`).
   - Identifies whether a device is mobile or desktop.
2. **Device Gating with Bypass Override:**
   - When a patient accesses desktop, or an admin accesses mobile, a warning modal (`DeviceMismatch.jsx`) is displayed.
   - Clicking *"Continue on this device anyway"* persists `tiva:device_override = 'true'` in both `sessionStorage` and `localStorage`.
   - `RoleGuard`, `OnboardingGuard`, and `PostLoginRedirect` respect this flag, eliminating infinite redirect loops.

---

## 🔒 Security & Anti-Leakage Architecture

The codebase incorporates multiple layers of security hardening to prevent data breaches, API leaks, and unauthorized access:

1. **Privilege Escalation Prevention Trigger (`prevent_role_escalation`):**
   - PostgreSQL trigger on `public.profiles` ensures that regular authenticated users cannot elevate their own role to `admin` or `super_admin` via client update calls.
2. **Hardened Emergency Snapshot RPC (`get_emergency_snapshot`):**
   - Runs with `SECURITY DEFINER STABLE`.
   - Validates input format (rejects SQL injection attempts and inputs shorter than 4 characters).
   - Strictly projects public emergency card fields, preventing internal database structure or token leakage.
3. **Row-Level Security (RLS):**
   - Enabled and enforced across **all 24 database tables**.
   - Authenticated users can only read and modify their own records or records explicitly assigned via `caregiver_assignments` or `institutions`.
4. **Anti-Open Redirect Protection:**
   - Redirect parameters in authentication flows (`logout`, `redirectToLogin`, `PostLoginRedirect`) are strictly validated to prevent phishing and unauthorized external redirects.
5. **Storage Resilience & Fallback:**
   - Secure uploads to Supabase Storage (`medical-vault`, `avatars`, `voice-notes`).
   - If storage is offline or quota-limited, `UploadFile` falls back to inline base64 DataURLs to guarantee that photo and document messages are never lost.

---

## 🩺 Hardware & Peripheral Connectivity (Web Bluetooth BLE)

Tiva communicates directly with modern medical wearables via the standard **Web Bluetooth API** (`BluetoothDeviceManager.jsx`):

- **Supported Standard GATT Services:**
  - Heart Rate (`0x180D`)
  - Pulse Oximeter / SpO2 (`0x1822`)
  - Blood Pressure Monitor (`0x1810`)
  - Glucose Meter (`0x1808`)
  - Health Thermometer (`0x1809`)
- **Direct Telemetry Ingestion:**
  - Readings captured from Bluetooth characteristics are automatically parsed and saved to `health_readings`.
  - Mock pairing controls are provided for testing without physical BLE hardware.

---

## 🗄 Database Schema & Migrations

The database consists of **24 normalized PostgreSQL tables** in `supabase/schema.sql`:

| Table | Purpose |
|---|---|
| `profiles` | Auth user metadata, display names, and system roles. |
| `health_profiles` | Core patient biometric baselines, allergies, conditions, and schedule config. |
| `health_readings` | Discrete metric measurements (BP, glucose, HR, SpO2, sleep, weight). |
| `medications` | Prescriptions, dosages, frequencies, and instructions. |
| `reminders` | Scheduled alerts for medication times. |
| `reminder_logs` | Adherence logs (taken, missed, snoozed timestamps). |
| `appointments` | Doctor visits, clinic check-ups, and calendar events. |
| `emergency_contacts` | First-response contact list with relationship and phone numbers. |
| `alerts` | System alerts (SOS, high vitals, missed doses, fall detection). |
| `predictions` | AI-generated risk evaluations, trends, and doctor reports. |
| `conversations` | Historical AI health companion chat threads. |
| `family_messages` | Care circle and patient-to-caregiver messaging. |
| `caregiver_assignments` | Verified links between caregivers and assigned patients. |
| `institutions` | Healthcare facility entities, subscription status, and admin links. |
| `institution_admin_invites` | Pending and accepted institution administration tokens. |
| `care_tasks` | Clinical to-do items and care routines. |
| `clinical_notes` | Clinician observations with pinning and categorization. |
| `check_in_observations` | Longitudinal biometric check-in data. |
| `medical_documents` | Clinical files, prescriptions, and lab report metadata. |
| `medical_records` | Structured medical history. |
| `wellness_entries` | Daily subjective wellbeing scores and mood logs. |
| `memory_notes` | Memory companion exercises and cognitive logs. |
| `subscriptions` | Active billing tier and payment records. |
| `audit_logs` | Security and compliance tracking logs. |

### Schema Update Workflow:
- Master schema: `supabase/schema.sql`
- Non-destructive production migrations & templates: `supabase/update_tables.sql`
- Detailed SQL reference: `src/DATABASE.md`

---

## ⚡ LRU Caching Engine & Clinical Safety

To ensure lightning-fast UI responsiveness on mobile devices, low data consumption in emerging markets, and zero-latency audio reminders without compromising clinical safety, Tiva incorporates an enterprise-grade, bounded **Least Recently Used (LRU) Caching Engine** ([`src/utils/lruCache.js`](./src/utils/lruCache.js)).

### Core Features:
- **$O(1)$ Time Complexity:** Hash-map keyed access combined with double-linked / insertion-ordered eviction prevents memory leaks and garbage collection thrashing on constrained devices.
- **Time-to-Live (TTL) Awareness:** Automatic staleness eviction guarantees that data is not retained indefinitely.
- **`peek()` Inspection:** Allows non-mutating inspection without false recency promotions.
- **`memoize()` Wrapper:** Declarative higher-order wrapper for async functions.

### Subsystem Singletons:
| Singleton | Capacity | TTL | Purpose |
|---|---|---|---|
| `ttsLRUCache` | 60 items | 1 Hour | Instant 0ms playback for repeated medication alerts, greeting prompts, and voice instructions. |
| `llmLRUCache` | 100 items | 30 Mins | Caches common health queries, sleep advice, and biometric educational summaries. |
| `emergencySnapshotLRUCache` | 30 items | 3 Mins | High-speed paramedic / first responder QR emergency profile lookups. |
| `documentAnalysisLRUCache` | 50 items | 15 Mins | Plain-language AI translations and contraindication analyses of medical vault records. |

### 🚨 Clinical Safety Guard:
> [!IMPORTANT]
> **Emergency Invalidation Policy:** Tiva strictly enforces that emergent symptoms (e.g. `is_emergency: true`, chest pain, shortness of breath, acute distress) are **NEVER cached** in the LRU engine. Every critical triage call executes fresh against real-time clinical assessment logic to protect patient safety.

---

## 🚀 Installation & Setup

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher (Tested on Node.js v24)
- **Supabase Account & Project:** [https://supabase.com](https://supabase.com)

### 2. Configure Environment
Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Provision Database
1. Navigate to your Supabase Dashboard ➔ **SQL Editor**.
2. Open [`supabase/schema.sql`](./supabase/schema.sql), paste into the editor, and click **Run**.
3. Verify that all 24 tables and triggers are active.

### 4. Install Dependencies & Launch
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be running locally at `http://localhost:5173`.

---

## 🛠 Available Scripts & Quality Assurance

| Command | Description |
|---|---|
| `npm run dev` | Starts Vite local development server with PWA support. |
| `npm run build` | Compiles production assets with strict bundling. |
| `npm run lint` | Runs ESLint across all files (`0 errors, 0 warnings`). |
| `npm run typecheck` | Validates TypeScript types across the codebase via `tsc`. |
| `npm test` | Executes the comprehensive 7-suite automated test orchestrator. |
| `npm run preview` | Serves the production build locally with security headers. |

---

## 🏆 Comprehensive Testing Scorecard

The project includes an automated end-to-end test suite (`tests/run-all.mjs`) executing all critical modules:

```text
================================================================
                     FINAL TEST SCORECARD                       
================================================================
[✓ PASS] Application Routes & Security Headers         35 passed, 0 failed
[✓ PASS] Device Detection & Responsive Gating          5 passed, 0 failed
[✓ PASS] Tiva Client & Supabase Database Queries       7 passed, 0 failed
[✓ PASS] PWA Manifest & Offline Assets                 8 passed, 0 failed
[✓ PASS] PostgreSQL Schema Integrity & RLS             27 passed, 0 failed
[✓ PASS] User Personas & Role Access Control           6 passed, 0 failed
[✓ PASS] LRU Cache Engine & Memory Constraints         6 passed, 0 failed
----------------------------------------------------------------
TOTALS: 94 PASSED | 0 FAILED | Duration: 10.15s
================================================================
```

### Test Suites Included:
- [`tests/routes.test.mjs`](./tests/routes.test.mjs): Verifies all 35 routes respond with `200 OK`, HTML doctype, `#root` container, `nosniff`, and `X-Frame-Options: DENY`.
- [`tests/device-detect.test.mjs`](./tests/device-detect.test.mjs): Verifies device detection across mobile/desktop user agents and storage override persistence.
- [`tests/tiva-client.test.mjs`](./tests/tiva-client.test.mjs): Tests entity proxy CRUD, functions adapter fallbacks, and live Supabase table accessibility.
- [`tests/pwa-assets.test.mjs`](./tests/pwa-assets.test.mjs): Confirms validity of `manifest.json`, icon assets, and offline fallback delivery.
- [`tests/schema-integrity.test.mjs`](./tests/schema-integrity.test.mjs): Validates all 24 tables, standard audit timestamps, RLS enablement, and RPC procedures.
- [`tests/personas.test.mjs`](./tests/personas.test.mjs): Validates access boundaries across Patient, Caregiver, Institution Admin, Super Admin, and First Responder personas.
- [`tests/lru-cache.test.mjs`](./tests/lru-cache.test.mjs): Verifies $O(1)$ capacity constraint, eviction order, TTL expiration, `peek()`, `memoize()`, and emergency safety guards.

---

## 📄 License
Private & Proprietary — Developed for Tiva Health Companion.
