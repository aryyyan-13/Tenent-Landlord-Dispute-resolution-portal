# Implementation Plan: Mediation-First ODR Module (Model A)

## 1. Problem & Background

The existing Tenant-Landlord Dispute Resolution Portal supports basic authentication and a
flat dispute-filing flow: a party files a dispute, an admin assigns a mediator, the mediator
records notes and a single proposed resolution, and both parties accept or reject it. This is
a reasonable MVP but it collapses two legally and procedurally distinct stages — **self-directed
negotiation** and **facilitated mediation** — into one, and it has no defined path for what
happens when mediation does not produce a settlement.

Indian ODR practice (SMART ODR, Presolv360, Jupitice) and the Mediation Act, 2023 point to a
three-stage model:

1. **Negotiation** — parties exchange structured offers/counter-offers directly, without a
   mediator, within a fixed window (e.g. 14–21 days).
2. **Mediation** — if negotiation fails to produce a settlement, a trained, empaneled mediator
   is assigned and runs joint sessions and private caucuses.
3. **Rent Authority readiness** — if mediation also fails, the platform does not adjudicate;
   it assembles a court/Rent-Authority-ready case bundle and closes the case with clear
   guidance on next steps.

This document is the implementation plan for building that three-stage workflow (**Model A**)
on top of the existing app, migrating the data layer from SQLite to PostgreSQL in the
process, and adding the mediator-panel, e-sign, and case-bundle capabilities the model
requires.

### What this change accomplishes
- Replaces the single `status` field on a dispute with a proper **state machine** that
  distinguishes negotiation, mediation, and the various closure types, and forbids invalid
  transitions (e.g. no one can unilaterally declare a winner).
- Adds a **negotiation room**: structured offer/counter-offer exchange with a full audit
  trail, before any mediator is involved.
- Adds a **mediator empanelment and onboarding pipeline**: applications, credential
  verification, admin approval, and an availability/expertise-based assignment mechanism.
- Adds a **mediator dashboard and case workspace**: session scheduling, joint vs. private
  (caucus) communication, private mediator notes, and closure actions (`Mark Settled`,
  `Mark Failed`).
- Adds a **settlement agreement pipeline**: structured terms → generated PDF → e-signature
  (pluggable provider, with an OTP-based fallback) → resolved case.
- Adds a **Rent Authority case bundle generator**: on mediation failure, assembles all
  evidence, notices, and a neutral mediation summary into a downloadable, filing-ready
  package, and clearly tells users the platform is not deciding the dispute.
- Migrates the database from SQLite (`better-sqlite3`) to **PostgreSQL**, since the richer
  relational structure (offers, sessions, signatures, bundles, notifications) and concurrent
  multi-user access pattern outgrow SQLite.

### Non-goals
- The platform never renders a binding decision on who is right. Every closure is either a
  mutually signed settlement, an explicit mediation-failed referral, a withdrawal, or a
  no-response closure.
- Full legal e-signature compliance (Aadhaar eSign / DSC via Digio or eMudhra) is designed
  as a pluggable interface but the MVP ships with an audited OTP + checkbox fallback; wiring
  a live provider account is a follow-on task, not part of this plan's Phase 1–5 scope.
- Video conferencing is link-based (Zoom/Meet/Daily URL pasted by the mediator), not an
  embedded WebRTC client.

---

## 2. High-Level Case State Machine

```
                 ┌─────────────────────┐
                 │  open_negotiation    │
                 └───────┬──────────────┘
        settlement        │  window expires /          │ filer withdraws
        signed by both    │  either party escalates     │
        parties           │                              │
        │                 ▼                              ▼
┌───────▼───────────┐  ┌──────────────────┐   ┌─────────────────────┐
│ resolved_settlement │  │  open_mediation   │   │  closed_withdrawn    │
│ _negotiation        │  └───────┬───────────┘   └─────────────────────┘
└─────────────────────┘          │
        settlement                │ mediator marks failed        opposing party
        signed by both            │                               never responds
        parties (via mediator)    ▼                               to filing
┌─────────────────────┐  ┌──────────────────┐           ┌─────────────────────┐
│ resolved_settlement  │  │ mediation_failed  │           │  closed_no_response  │
│ _mediation           │  └───────┬───────────┘           └─────────────────────┘
└─────────────────────┘          │ bundle generated (automatic)
                                   ▼
                          ┌──────────────────────────────┐
                          │ closed_referred_rent_authority │
                          └──────────────────────────────┘
```

**States** (`case_status` enum): `open_negotiation`, `open_mediation`,
`resolved_settlement_negotiation`, `resolved_settlement_mediation`, `mediation_failed`,
`closed_referred_rent_authority`, `closed_withdrawn`, `closed_no_response`.

**Transition guard rules** (enforced in `services/CaseStateMachine.js`, never in the
frontend):

| From | To | Who can trigger | Precondition |
|---|---|---|---|
| `open_negotiation` | `resolved_settlement_negotiation` | system (auto, on final signature) | A `settlement_agreements` row with `resolution_stage='negotiation'` has `status='fully_signed'` |
| `open_negotiation` | `open_mediation` | system (scheduled job) or either party | Negotiation deadline passed with no fully-signed settlement, OR either party explicitly requests escalation |
| `open_negotiation` | `closed_withdrawn` | filer only | Filer confirms withdrawal; opposing party notified |
| `open_negotiation` | `closed_no_response` | system (scheduled job) | Opposing party has not opened/responded to the case within the response window (default 15 days) after reminders |
| `open_mediation` | `resolved_settlement_mediation` | system (auto, on final signature) | A `settlement_agreements` row with `resolution_stage='mediation'` has `status='fully_signed'` |
| `open_mediation` | `mediation_failed` | assigned mediator only | Mediator submits a mediation summary and explicitly marks failed |
| `open_mediation` | `closed_withdrawn` | filer only | Same as above |
| `mediation_failed` | `closed_referred_rent_authority` | system (auto) | Rent Authority bundle successfully generated |

No transition ever allows a party or admin to directly set `resolved_*` without a
corresponding `fully_signed` settlement row, and no transition allows setting a "winner" —
this is enforced at the service layer, not just the UI, so the guarantee holds even if a
new client is built later.

---

## 3. Database Schema (PostgreSQL)

This section supersedes the current SQLite schema. Existing tables (`users`, `disputes`,
`dispute_documents`, `case_timeline`, `messages`, `mediation_sessions`) are extended or
renamed as noted; nothing is dropped without a migration path (see §8).

### 3.1 `users` (extended, existing table)

No structural change to the base table. `role` enum gains no new values — `tenant`,
`landlord`, `mediator`, `admin` already cover the model. Mediator-specific data moves to a
new `mediator_profiles` table (below) rather than bloating `users`.

```sql
-- unchanged from current schema, restated for completeness
CREATE TYPE user_role AS ENUM ('tenant', 'landlord', 'mediator', 'admin');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL,
  contact       TEXT,
  address       TEXT,
  kyc_document_path TEXT,
  kyc_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 `mediator_profiles` (new)

Purpose: holds the empanelment application, training credentials, and approval state for
users with `role = 'mediator'`. Kept separate from `users` so a tenant/landlord account can
never accidentally carry mediator fields, and so the approval workflow has its own audit
trail.

```sql
CREATE TYPE mediator_status AS ENUM ('pending', 'approved', 'rejected', 'inactive');

CREATE TABLE mediator_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bar_enrollment_no         TEXT,
  years_experience          INTEGER,
  training_program          TEXT,             -- e.g. "IICA Certified Mediator Program"
  training_hours            INTEGER,
  certificate_document_path TEXT,
  certificate_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  areas_of_expertise        JSONB NOT NULL DEFAULT '[]',  -- e.g. ["deposit","maintenance"]
  languages                 JSONB NOT NULL DEFAULT '[]',  -- e.g. ["en","hi","mr"]
  city                      TEXT,
  availability_hours_per_week SMALLINT,
  status                    mediator_status NOT NULL DEFAULT 'pending',
  reviewed_by_id            UUID REFERENCES users(id),
  reviewed_at               TIMESTAMPTZ,
  rejection_reason          TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mediator_profiles_status ON mediator_profiles(status);
CREATE INDEX idx_mediator_profiles_city ON mediator_profiles(city);
```

### 3.3 `disputes` (extended, existing table)

Replaces the current free-text `status` column with the `case_status` enum, and adds the
fields the negotiation/mediation windows and case-bundle flow need.

```sql
CREATE TYPE dispute_category AS ENUM (
  'security_deposit', 'rent_payment', 'maintenance', 'property_damage',
  'agreement_violation', 'eviction_notice', 'other'
);

CREATE TYPE case_status AS ENUM (
  'open_negotiation',
  'open_mediation',
  'resolved_settlement_negotiation',
  'resolved_settlement_mediation',
  'mediation_failed',
  'closed_referred_rent_authority',
  'closed_withdrawn',
  'closed_no_response'
);

CREATE TABLE disputes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number           TEXT UNIQUE NOT NULL,          -- e.g. TLDRP-2026-0001
  filed_by_id           UUID NOT NULL REFERENCES users(id),
  opposing_party_id     UUID NOT NULL REFERENCES users(id),
  category              dispute_category NOT NULL,
  description           TEXT NOT NULL,
  desired_outcome       TEXT,                          -- structured field from filing form
  property_address      TEXT,
  case_status           case_status NOT NULL DEFAULT 'open_negotiation',
  mediator_id           UUID REFERENCES users(id),
  negotiation_deadline  TIMESTAMPTZ,                    -- set on filing: now() + 14–21 days
  response_due_at       TIMESTAMPTZ,                    -- opposing party must respond by
  responded_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_case_status ON disputes(case_status);
CREATE INDEX idx_disputes_filed_by ON disputes(filed_by_id);
CREATE INDEX idx_disputes_opposing_party ON disputes(opposing_party_id);
CREATE INDEX idx_disputes_mediator ON disputes(mediator_id);
CREATE INDEX idx_disputes_negotiation_deadline ON disputes(negotiation_deadline)
  WHERE case_status = 'open_negotiation';
```

### 3.4 `negotiation_offers` (new)

Purpose: the structured offer/counter-offer exchange that defines Stage 1. Every offer is
immutable once created; a counter-offer is a new row linked to its parent, so the full
negotiation history is reconstructable and cannot be edited after the fact.

```sql
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'countered', 'withdrawn');

CREATE TABLE negotiation_offers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id        UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  proposed_by_id    UUID NOT NULL REFERENCES users(id),
  parent_offer_id   UUID REFERENCES negotiation_offers(id), -- null for the opening offer
  terms_summary     TEXT NOT NULL,          -- human-readable, e.g. "Refund ₹60,000 by 10 Aug"
  amount            NUMERIC(12,2),
  due_date          DATE,
  status            offer_status NOT NULL DEFAULT 'pending',
  responded_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_negotiation_offers_dispute ON negotiation_offers(dispute_id);
CREATE INDEX idx_negotiation_offers_parent ON negotiation_offers(parent_offer_id);
```

### 3.5 `messages` (extended, existing table)

Extended to support **caucus** (private mediator ↔ one-party) messages, not just joint
threads, and to distinguish system-generated entries from user chat.

```sql
CREATE TYPE message_type AS ENUM ('chat', 'system', 'offer_note');
CREATE TYPE message_visibility AS ENUM ('joint', 'caucus');

CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id        UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES users(id),
  body              TEXT NOT NULL,
  message_type      message_type NOT NULL DEFAULT 'chat',
  visibility        message_visibility NOT NULL DEFAULT 'joint',
  caucus_with_id    UUID REFERENCES users(id),  -- set only when visibility = 'caucus'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_dispute ON messages(dispute_id);
-- Row-level access rule (enforced in the service layer, not Postgres RLS, to keep
-- the MVP simple): a caucus message is only ever returned to the mediator and the
-- single party named in caucus_with_id — never the other party, never in joint views.
```

### 3.6 `mediation_sessions` (extended, existing table)

Extended with scheduling, session type (joint vs. caucus), and a **mediator-private notes**
field that is never exposed via any party-facing endpoint.

```sql
CREATE TYPE session_type AS ENUM ('joint', 'caucus');
CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'cancelled');

CREATE TABLE mediation_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id            UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  mediator_id           UUID NOT NULL REFERENCES users(id),
  session_type          session_type NOT NULL DEFAULT 'joint',
  caucus_with_id        UUID REFERENCES users(id),  -- set only when session_type = 'caucus'
  scheduled_at          TIMESTAMPTZ,
  video_link            TEXT,
  status                session_status NOT NULL DEFAULT 'scheduled',
  session_notes         TEXT,          -- shared summary, visible to both parties
  mediator_private_notes TEXT,          -- never exposed to tenant/landlord endpoints
  proposed_resolution   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mediation_sessions_dispute ON mediation_sessions(dispute_id);
CREATE INDEX idx_mediation_sessions_mediator ON mediation_sessions(mediator_id);
```

### 3.7 `settlement_agreements` (new)

Purpose: the terms document produced at either stage, its generated PDF, and its signing
status. A dispute may have at most one `fully_signed` agreement, but can have earlier
`void` drafts (e.g. a mediation-stage agreement voids any unsigned negotiation-stage draft).

```sql
CREATE TYPE resolution_stage AS ENUM ('negotiation', 'mediation');
CREATE TYPE agreement_status AS ENUM ('draft', 'pending_signatures', 'fully_signed', 'void');

CREATE TABLE settlement_agreements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id        UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  resolution_stage  resolution_stage NOT NULL,
  terms_text        TEXT NOT NULL,        -- structured/rendered final terms
  compliance_deadline DATE,
  generated_pdf_path TEXT,
  status            agreement_status NOT NULL DEFAULT 'draft',
  created_by_id     UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlement_agreements_dispute ON settlement_agreements(dispute_id);
-- Enforced in application logic: only one row per dispute may be in
-- 'pending_signatures' or 'fully_signed' at a time.
```

### 3.8 `settlement_signatures` (new)

```sql
CREATE TYPE signer_role AS ENUM ('tenant', 'landlord', 'mediator');
CREATE TYPE signature_method AS ENUM ('otp_checkbox', 'esign_api');

CREATE TABLE settlement_signatures (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_agreement_id UUID NOT NULL REFERENCES settlement_agreements(id) ON DELETE CASCADE,
  signer_id               UUID NOT NULL REFERENCES users(id),
  signer_role             signer_role NOT NULL,
  signature_method        signature_method NOT NULL,
  esign_provider          TEXT,               -- e.g. 'digio', null for otp_checkbox
  esign_provider_reference TEXT,               -- external transaction/document id
  typed_full_name         TEXT,               -- for otp_checkbox method
  ip_address              INET,
  signed_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (settlement_agreement_id, signer_id)
);
```

### 3.9 `dispute_documents` (existing, becomes the general document vault)

Extended with a `doc_type` so the same table serves evidence, notices, payment proofs, the
tenancy agreement, generated settlement PDFs, and the Rent Authority bundle.

```sql
CREATE TYPE document_type AS ENUM (
  'evidence', 'tenancy_agreement', 'notice', 'payment_proof',
  'settlement_agreement', 'rent_authority_bundle', 'other'
);

CREATE TABLE dispute_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id      UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  uploaded_by_id  UUID REFERENCES users(id),  -- null for system-generated documents
  doc_type        document_type NOT NULL DEFAULT 'evidence',
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispute_documents_dispute ON dispute_documents(dispute_id);
CREATE INDEX idx_dispute_documents_type ON dispute_documents(doc_type);
```

### 3.10 `case_status_history` (renames/extends existing `case_timeline`)

```sql
CREATE TABLE case_status_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id    UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  from_status   case_status,
  to_status     case_status NOT NULL,
  changed_by_id UUID REFERENCES users(id),   -- null = system/scheduled job
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_status_history_dispute ON case_status_history(dispute_id);
```

### 3.11 `rent_authority_bundles` (new)

```sql
CREATE TABLE rent_authority_bundles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id            UUID NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE CASCADE,
  mediation_summary_text TEXT,          -- non-binding, drafted by mediator on failure
  included_document_ids JSONB NOT NULL DEFAULT '[]',
  pdf_path              TEXT NOT NULL,
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.12 `notifications` (new)

```sql
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'whatsapp', 'in_app');

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  dispute_id  UUID REFERENCES disputes(id) ON DELETE CASCADE,
  channel     notification_channel NOT NULL,
  event_type  TEXT NOT NULL,   -- e.g. 'new_dispute', 'response_due', 'session_scheduled'
  payload     JSONB NOT NULL DEFAULT '{}',
  sent_at     TIMESTAMPTZ,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);
```

---

## 4. Implementation Order (Dependency-First)

Each numbered group below is a logical unit of work. Later groups depend on earlier ones,
so they are built and merged in this order.

### Group 1 — Database migration foundation

**`backend/config/db.js`** (replaces the `better-sqlite3` version)
- Purpose: establish a `pg` connection pool against PostgreSQL, replacing the
  `better-sqlite3` singleton.
- Key exports: `pool` (a `pg.Pool` instance), `query(text, params)` helper that logs slow
  queries in development.
- Everything downstream (models, services) imports this instead of the old `db` object.

**`backend/db/migrations/0001_init_core.sql` … `0012_notifications.sql`**
- One migration file per table group in §3, run via `node-pg-migrate` or a minimal custom
  runner (`backend/db/migrate.js`) that tracks applied migrations in a `schema_migrations`
  table.
- Ordered exactly as sections 3.1 → 3.12 above, since later tables have foreign keys into
  earlier ones (`negotiation_offers` needs `disputes`, `settlement_signatures` needs
  `settlement_agreements`, etc.).

**`backend/scripts/migrate-sqlite-to-postgres.js`**
- One-off data migration script: reads every row from the existing `data/tldrp.sqlite`
  file and inserts it into the new Postgres tables, mapping the old free-text `status`
  values onto the new `case_status` enum (`Filed`/`Under Review` → `open_negotiation`,
  `Mediation` → `open_mediation`, `Resolved` → `resolved_settlement_mediation`,
  `Escalated` → `mediation_failed`, `Closed` → `closed_referred_rent_authority`).
- Run once during cutover; not part of the ongoing app.

### Group 2 — Core state machine and models

**`backend/services/CaseStateMachine.js`**
- Purpose: the single source of truth for which `case_status` transitions are legal, who
  may trigger them, and what side effects (status-history row, notifications) must fire.
- Key structure: a transition table matching §2, e.g.
  ```js
  const TRANSITIONS = {
    open_negotiation: {
      resolved_settlement_negotiation: { actor: 'system', guard: hasFullySignedAgreement('negotiation') },
      open_mediation:                  { actor: ['tenant','landlord','system'], guard: negotiationWindowExpiredOrEscalationRequested },
      closed_withdrawn:                { actor: 'filer', guard: () => true },
      closed_no_response:              { actor: 'system', guard: responseWindowExpired }
    },
    open_mediation: {
      resolved_settlement_mediation: { actor: 'system', guard: hasFullySignedAgreement('mediation') },
      mediation_failed:               { actor: 'assigned_mediator', guard: hasMediationSummary },
      closed_withdrawn:               { actor: 'filer', guard: () => true }
    },
    mediation_failed: {
      closed_referred_rent_authority: { actor: 'system', guard: bundleGenerated }
    }
  };
  ```
- Main function: `async function transition(disputeId, toStatus, { actorId, reason })` —
  looks up the current status, validates the actor and guard, writes the new status plus a
  `case_status_history` row, and triggers relevant notifications. Every other service calls
  this instead of writing `case_status` directly.

**`backend/models/*.js`** (one file per table in §3, replacing the SQLite versions)
- `Dispute.js`, `NegotiationOffer.js`, `MediatorProfile.js`, `MediationSession.js`,
  `SettlementAgreement.js`, `SettlementSignature.js`, `Document.js`,
  `CaseStatusHistory.js`, `RentAuthorityBundle.js`, `Notification.js`.
- Each exposes plain data-access functions (`create`, `findById`, `findByDispute`, etc.)
  using parameterized `pg` queries. No business logic lives here — that's the services'
  job — keeping the mapping to a future ORM (if adopted later) straightforward.

### Group 3 — Negotiation (Stage 1)

**`backend/services/NegotiationService.js`**
- Purpose: everything about the offer/counter-offer exchange before a mediator is
  involved.
- Main functions:
  - `fileDispute({ filedById, opposingPartyId, category, description, desiredOutcome, evidenceFiles })` —
    creates the dispute in `open_negotiation`, sets `negotiation_deadline` (now + 21 days,
    configurable) and `response_due_at` (now + 7 days), stores evidence via `Document.js`,
    and sends a `new_dispute` notification to the opposing party.
  - `submitOffer({ disputeId, proposedById, termsSummary, amount, dueDate, parentOfferId })` —
    inserts a `negotiation_offers` row; if `parentOfferId` is set, marks the parent
    `countered`.
  - `respondToOffer({ offerId, respondingById, decision })` — `decision` is
    `accepted`/`rejected`; on `accepted`, calls `SettlementService.draftFromOffer(offer)`.
  - `requestEscalation({ disputeId, requestedById })` — either party can ask to move to
    mediation early; calls `CaseStateMachine.transition(..., 'open_mediation', ...)`.
- Fits the workflow as the entry point for every new case and the only way a case reaches
  `resolved_settlement_negotiation` or moves on to mediation.

**`backend/routes/negotiation.js`**
- `POST /api/disputes` — files a dispute (supersedes the old `POST /api/disputes` handler;
  request shape gains `desiredOutcome` and no longer accepts a raw `category` value not in
  the new enum).
- `POST /api/disputes/:id/offers` — submit an offer or counter-offer.
- `GET /api/disputes/:id/offers` — full offer history (immutable, ordered by `created_at`).
- `POST /api/disputes/:id/offers/:offerId/respond` — accept/reject/counter.
- `POST /api/disputes/:id/escalate` — request early escalation to mediation.
- All routes reuse the existing `authenticate` middleware and a new `assertParty(dispute)`
  guard (only the filer or opposing party, not arbitrary users, may act on a case at this
  stage).

**`frontend/src/pages/NegotiationRoom.jsx`** (new; supersedes the current `FileDispute`
flow for the negotiation phase, embedded inside `CaseDetail`)
- Purpose: the structured offer/counter-offer UI.
- Key components:
  - `components/negotiation/OfferTimeline.jsx` — renders the immutable offer chain
    (initial offer → counter → counter → accepted/rejected), each with amount, due date,
    and status badge.
  - `components/negotiation/MakeOfferForm.jsx` — terms summary, optional amount/due date,
    "Propose" button; used both for the opening offer and for counters.
  - `components/negotiation/EscalateBanner.jsx` — shows the negotiation deadline
    countdown and an "Move to mediation" button once either party is eligible to escalate.

### Group 4 — Mediator empanelment and assignment

**`backend/services/MediatorService.js`**
- Purpose: mediator onboarding, admin approval, and case assignment.
- Main functions:
  - `applyAsMediator({ userId, barEnrollmentNo, yearsExperience, trainingProgram,
    trainingHours, certificateFile, areasOfExpertise, languages, city,
    availabilityHoursPerWeek })` — creates a `mediator_profiles` row with
    `status='pending'`.
  - `reviewApplication({ mediatorProfileId, reviewedById, decision, rejectionReason })` —
    admin-only; sets `approved`/`rejected`, verifies the certificate flag.
  - `findAvailableMediators({ category, city, language })` — used for auto-assignment
    suggestions; ranks approved, active mediators by matching expertise/city/language and
    current open caseload (`COUNT(*) FROM disputes WHERE mediator_id = ... AND case_status = 'open_mediation'`).
  - `assignMediator({ disputeId, mediatorId, assignedById, method })` — sets
    `disputes.mediator_id`, calls `CaseStateMachine.transition(..., 'open_mediation', ...)`
    if the case is still in negotiation, and notifies all three parties.
- Fits the workflow at the negotiation → mediation boundary: this is what actually staffs
  Stage 2.

**`backend/routes/mediatorOnboarding.js`**
- `POST /api/mediators/apply` — mediator role self-service application (certificate
  upload via the existing `upload` middleware).
- `GET /api/admin/mediators/applications` — admin queue of pending applications.
- `PATCH /api/admin/mediators/applications/:id` — approve/reject.
- `GET /api/admin/mediators` — approved panel, with filters by city/expertise/language for
  manual assignment.

**`backend/routes/admin.js`** (extended)
- `POST /api/admin/disputes/:id/assign-mediator` — manual override, calls
  `MediatorService.assignMediator` with `method='manual'`.
- `GET /api/admin/disputes/:id/suggested-mediators` — surfaces
  `MediatorService.findAvailableMediators` results for the admin to pick from.
- `GET /api/admin/reports` — extended analytics: case counts by status, % resolved in
  negotiation vs. mediation, average time-to-resolution per stage (see §6).

**`frontend/src/pages/mediator/MediatorOnboarding.jsx`**
- Application form matching the fields above; shown to any user who registers with
  `role='mediator'` and has no `mediator_profiles` row yet, or whose application was
  rejected (with the reason shown and a re-apply option).

**`frontend/src/pages/admin/MediatorPanelManagement.jsx`**
- Tabbed admin view: `Pending applications` (approve/reject with certificate preview),
  `Active panel` (deactivate, edit expertise/city), `Assignment override` (per-case
  dropdown of suggested mediators, matching the existing `AdminPanel.jsx` "All cases" tab
  but now sourced from `findAvailableMediators`).

### Group 5 — Mediation sessions and caucusing (Stage 2)

**`backend/services/MediationService.js`**
- Purpose: everything the assigned mediator does once a case is in `open_mediation`.
- Main functions:
  - `scheduleSession({ disputeId, mediatorId, sessionType, caucusWithId, scheduledAt,
    videoLink })` — creates a `mediation_sessions` row; sends `session_scheduled`
    notifications only to the relevant parties (both, for `joint`; one, for `caucus`).
  - `recordSessionOutcome({ sessionId, sessionNotes, mediatorPrivateNotes,
    proposedResolution, status })` — updates the session; `sessionNotes` and
    `proposedResolution` are party-visible, `mediatorPrivateNotes` never is.
  - `proposeResolution({ disputeId, mediatorId, termsSummary, amount, dueDate })` — wraps
    `SettlementService.draftFromMediator(...)` so the mediator can push a settlement draft
    to both parties for signature.
  - `markFailed({ disputeId, mediatorId, mediationSummary })` — writes the summary,
    transitions the case to `mediation_failed` via `CaseStateMachine`, and kicks off
    `BundleGeneratorService.generate(disputeId)`.
- Fits the workflow as the Stage 2 engine: it is the only path into
  `resolved_settlement_mediation` (via settlement) or `mediation_failed`.

**`backend/routes/mediation.js`** (rewritten from the current version)
- `POST /api/mediation/:disputeId/sessions` — schedule a session (joint or caucus).
- `PATCH /api/mediation/sessions/:sessionId` — record notes/outcome.
- `POST /api/mediation/:disputeId/propose-resolution` — mediator pushes a settlement
  draft.
- `POST /api/mediation/:disputeId/mark-failed` — mediator-only closure action.
- `GET /api/mediation/:disputeId/sessions` — list, filtered server-side so a party never
  receives another party's caucus sessions or the `mediator_private_notes` field.

**`frontend/src/pages/mediator/MediatorDashboard.jsx`**
- Case list scoped to the logged-in mediator: status, parties, property, next session.

**`frontend/src/pages/mediator/CaseWorkspace.jsx`**
- Full case view for the mediator: negotiation history, evidence, joint + caucus chat
  (via the extended `messages` table), session scheduler, "Propose resolution" and "Mark
  failed" actions.

**`frontend/src/components/negotiation/NegotiationChat.jsx`** (extended for caucus)
- Same base chat component used in Stage 1, extended with a visibility indicator ("Private
  to you and the mediator") when `visibility='caucus'`, and — critically — the component
  only ever renders messages the API actually returned, so there is no client-side
  filtering of sensitive data to get wrong.

### Group 6 — Settlement and e-signature

**`backend/services/SettlementService.js`**
- Purpose: turn an accepted offer or a mediator's proposed resolution into a signable
  agreement, and drive it to `fully_signed`.
- Main functions:
  - `draftFromOffer(offer)` / `draftFromMediator({...})` — creates a
    `settlement_agreements` row (`status='draft'`), renders `terms_text` from a template,
    voids any other non-signed draft for the same dispute.
  - `sendForSignature(agreementId)` — generates the PDF (via `pdf-lib` or similar),
    stores it as a `dispute_documents` row with `doc_type='settlement_agreement'`, sets
    `status='pending_signatures'`, notifies both parties (and the mediator, at Stage 2).
  - `recordSignature({ agreementId, signerId, method, ...providerFields })` — inserts a
    `settlement_signatures` row; once every required signer (`tenant`, `landlord`, and
    `mediator` if Stage 2) has signed, sets `status='fully_signed'` and calls
    `CaseStateMachine.transition(...)` to the matching resolved status.
- Fits the workflow as the closure mechanism for both Stage 1 and Stage 2 — it is the only
  path that can produce a `resolved_*` status.

**`backend/services/ESignService.js`** (pluggable abstraction)
- Purpose: isolate the signature mechanism so a real provider can be swapped in without
  touching `SettlementService`.
- Interface: `initiateSignature({ agreementId, signerId })` and
  `handleCallback(payload)`.
- `backend/integrations/esign/OtpFallbackClient.js` — MVP implementation: sends an OTP to
  the signer's registered contact, verifies it, and records `signature_method='otp_checkbox'`
  with the typed full name and IP address as the audit trail.
- `backend/integrations/esign/DigioClient.js` — stubbed provider implementation matching
  the same interface, wired but disabled until API credentials are available; documents the
  webhook contract for `handleCallback`.
- `backend/routes/webhooks/esign.js` — `POST /api/webhooks/esign/:provider` receives
  provider callbacks and forwards to `ESignService.handleCallback`.

**`frontend/src/pages/SettlementReview.jsx`**
- Renders the settlement terms, a PDF preview, and the signature flow
  (`components/esign/OtpSignModal.jsx` for the MVP path: OTP entry, typed name, "I agree
  and sign" checkbox, submit).
- Shows both parties' (and the mediator's, if applicable) signature status live.

### Group 7 — Rent Authority readiness (Stage 3)

**`backend/services/BundleGeneratorService.js`**
- Purpose: assemble the case-closure package when mediation fails.
- Main function: `generate(disputeId)` — pulls the tenancy agreement, all evidence
  documents, notices, payment proofs, the dispute description, offer history summary, and
  mediator's mediation summary; renders a single PDF plus a manifest; stores it as a
  `rent_authority_bundles` row and a `dispute_documents` row
  (`doc_type='rent_authority_bundle'`); calls
  `CaseStateMachine.transition(disputeId, 'closed_referred_rent_authority', { actorId: null, reason: 'bundle generated' })`.

**`backend/routes/documents.js`** (new; generalizes document access)
- `GET /api/disputes/:id/bundle` — download the generated Rent Authority bundle, once
  available.
- `GET /api/disputes/:id/documents` — full vault listing (existing evidence route
  extended with `doc_type` filtering).

**`frontend/src/pages/CaseBundleDownload.jsx`**
- Shown once a case reaches `mediation_failed` / `closed_referred_rent_authority`: the
  required legal disclaimer copy (§7), a document checklist, a link to a locally
  applicable Rent Authority filing-format reference, and the bundle download button.

### Group 8 — Notifications and scheduled jobs

**`backend/services/NotificationService.js`**
- Purpose: single entry point (`notify({ userId, disputeId, eventType, channel, payload })`)
  used by every other service instead of calling providers directly.
- `backend/integrations/notifications/EmailProvider.js`,
  `SmsProvider.js`, `WhatsAppProvider.js` — thin wrappers around whichever transactional
  provider is chosen later (e.g. SES/SendGrid, MSG91, WhatsApp Business API); each exposes
  the same `send(to, template, data)` signature so `NotificationService` doesn't branch on
  provider.

**`backend/jobs/negotiationDeadlineCheck.js`**
- Scheduled (e.g. hourly via `node-cron`): finds disputes in `open_negotiation` past
  `negotiation_deadline` with no `fully_signed` agreement, transitions them to
  `open_mediation`.

**`backend/jobs/responseDueReminder.js`**
- Finds disputes where `responded_at IS NULL AND response_due_at` is approaching or
  passed; sends reminders, and — past a grace period — transitions to
  `closed_no_response`.

**`backend/jobs/mediationSessionReminder.js`**
- Sends reminders ahead of `mediation_sessions.scheduled_at`.

### Group 9 — Admin reporting

**`frontend/src/pages/admin/ODRReports.jsx`**
- Extends the existing `AdminPanel` analytics tab with: count of disputes by
  `case_status`, % resolved at negotiation vs. mediation, average days-to-resolution per
  stage, mediator caseload table. Backed by `GET /api/admin/reports` (Group 4).

---

## 5. Legal/Positioning Copy (must ship with the UI, not just this plan)

The following strings are required, verbatim in substance, on the relevant screens:

- On the negotiation and mediation screens: *"This platform facilitates negotiation and
  mediation. It does not act as a court or Rent Authority."*
- On the settlement review screen, before signing: *"Settlement agreements reached here
  are binding between parties and can be enforced in court if needed."*
- On the Rent Authority bundle screen: *"If mediation fails, you may approach your local
  Rent Authority / civil court with the generated case bundle."*

These are implemented once as shared copy (e.g. `frontend/src/content/legalDisclaimers.js`)
and imported wherever needed, so the wording stays consistent and is easy to update if
legal review requires changes.

---

## 6. Migration & Rollout Phasing

1. **Phase 0 — Data layer cutover**: ship Group 1 (Postgres schema + migration script),
   run against a staging copy of the existing SQLite data, verify row counts and enum
   mappings, then cut the running app over. No user-facing behavior changes yet.
2. **Phase 1 — Negotiation module**: ship Groups 2–3. Existing "File a Dispute" flow is
   replaced by the negotiation room; old cases already in the SQLite-derived `Filed`/`Under
   Review` states are mapped into `open_negotiation` so they continue in the new flow.
3. **Phase 2 — Mediator empanelment**: ship Group 4. Admins can now onboard a real
   mediator panel instead of manually creating mediator accounts.
4. **Phase 3 — Mediation sessions & caucus**: ship Group 5.
5. **Phase 4 — Settlement & e-sign (OTP fallback)**: ship Group 6. This is the first
   phase where a case can reach a `resolved_*` status end-to-end.
6. **Phase 5 — Rent Authority bundle & closure rules**: ship Group 7, plus the
   `closed_withdrawn` / `closed_no_response` transitions.
7. **Phase 6 — Notifications & reporting**: ship Groups 8–9. Can run in parallel with
   Phases 3–5 since it has no hard dependency beyond Group 2's state machine.
8. **Phase 7 (follow-on, outside this plan's scope)** — wire a live e-sign provider
   (Digio/eMudhra) behind the `ESignService` interface built in Phase 4, and replace
   link-based video with an embedded client if needed.

---

## 7. Testing Notes

- `CaseStateMachine.transition` gets unit tests for every legal transition in §2's table
  and, importantly, tests asserting every *illegal* transition throws (e.g. a party trying
  to set `resolved_settlement_mediation` without a signed agreement).
- `MediationService` caucus tests must assert that a `GET` for one party's messages/sessions
  never includes another party's caucus rows or `mediator_private_notes` — this is a
  confidentiality guarantee, not just a feature, and should be covered by an integration
  test that logs in as each role and checks response payloads directly.
- `BundleGeneratorService` gets a snapshot test on a fixture dispute to confirm the bundle
  PDF includes every expected document category and the mediation summary, and excludes
  anything from `mediator_private_notes`.
