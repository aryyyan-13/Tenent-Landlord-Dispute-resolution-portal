/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // 3.1 users
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS "citext";

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
  `);

  // 3.2 mediator_profiles
  pgm.sql(`
    CREATE TYPE mediator_status AS ENUM ('pending', 'approved', 'rejected', 'inactive');

    CREATE TABLE mediator_profiles (
      id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id                   UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      bar_enrollment_no         TEXT,
      years_experience          INTEGER,
      training_program          TEXT,
      training_hours            INTEGER,
      certificate_document_path TEXT,
      certificate_verified      BOOLEAN NOT NULL DEFAULT FALSE,
      areas_of_expertise        JSONB NOT NULL DEFAULT '[]',
      languages                 JSONB NOT NULL DEFAULT '[]',
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
  `);

  // 3.3 disputes
  pgm.sql(`
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
      case_number           TEXT UNIQUE NOT NULL,
      filed_by_id           UUID NOT NULL REFERENCES users(id),
      opposing_party_id     UUID NOT NULL REFERENCES users(id),
      category              dispute_category NOT NULL,
      description           TEXT NOT NULL,
      desired_outcome       TEXT,
      property_address      TEXT,
      case_status           case_status NOT NULL DEFAULT 'open_negotiation',
      mediator_id           UUID REFERENCES users(id),
      negotiation_deadline  TIMESTAMPTZ,
      response_due_at       TIMESTAMPTZ,
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
  `);

  // 3.4 negotiation_offers
  pgm.sql(`
    CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'countered', 'withdrawn');

    CREATE TABLE negotiation_offers (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dispute_id        UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
      proposed_by_id    UUID NOT NULL REFERENCES users(id),
      parent_offer_id   UUID REFERENCES negotiation_offers(id),
      terms_summary     TEXT NOT NULL,
      amount            NUMERIC(12,2),
      due_date          DATE,
      status            offer_status NOT NULL DEFAULT 'pending',
      responded_at      TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_negotiation_offers_dispute ON negotiation_offers(dispute_id);
    CREATE INDEX idx_negotiation_offers_parent ON negotiation_offers(parent_offer_id);
  `);

  // 3.5 messages
  pgm.sql(`
    CREATE TYPE message_type AS ENUM ('chat', 'system', 'offer_note');
    CREATE TYPE message_visibility AS ENUM ('joint', 'caucus');

    CREATE TABLE messages (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dispute_id        UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
      sender_id         UUID NOT NULL REFERENCES users(id),
      body              TEXT NOT NULL,
      message_type      message_type NOT NULL DEFAULT 'chat',
      visibility        message_visibility NOT NULL DEFAULT 'joint',
      caucus_with_id    UUID REFERENCES users(id),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_messages_dispute ON messages(dispute_id);
  `);

  // 3.6 mediation_sessions
  pgm.sql(`
    CREATE TYPE session_type AS ENUM ('joint', 'caucus');
    CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'cancelled');

    CREATE TABLE mediation_sessions (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dispute_id            UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
      mediator_id           UUID NOT NULL REFERENCES users(id),
      session_type          session_type NOT NULL DEFAULT 'joint',
      caucus_with_id        UUID REFERENCES users(id),
      scheduled_at          TIMESTAMPTZ,
      video_link            TEXT,
      status                session_status NOT NULL DEFAULT 'scheduled',
      session_notes         TEXT,
      mediator_private_notes TEXT,
      proposed_resolution   TEXT,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_mediation_sessions_dispute ON mediation_sessions(dispute_id);
    CREATE INDEX idx_mediation_sessions_mediator ON mediation_sessions(mediator_id);
  `);

  // 3.7 settlement_agreements
  pgm.sql(`
    CREATE TYPE resolution_stage AS ENUM ('negotiation', 'mediation');
    CREATE TYPE agreement_status AS ENUM ('draft', 'pending_signatures', 'fully_signed', 'void');

    CREATE TABLE settlement_agreements (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dispute_id        UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
      resolution_stage  resolution_stage NOT NULL,
      terms_text        TEXT NOT NULL,
      compliance_deadline DATE,
      generated_pdf_path TEXT,
      status            agreement_status NOT NULL DEFAULT 'draft',
      created_by_id     UUID NOT NULL REFERENCES users(id),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_settlement_agreements_dispute ON settlement_agreements(dispute_id);
  `);

  // 3.8 settlement_signatures
  pgm.sql(`
    CREATE TYPE signer_role AS ENUM ('tenant', 'landlord', 'mediator');
    CREATE TYPE signature_method AS ENUM ('otp_checkbox', 'esign_api');

    CREATE TABLE settlement_signatures (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      settlement_agreement_id UUID NOT NULL REFERENCES settlement_agreements(id) ON DELETE CASCADE,
      signer_id               UUID NOT NULL REFERENCES users(id),
      signer_role             signer_role NOT NULL,
      signature_method        signature_method NOT NULL,
      esign_provider          TEXT,
      esign_provider_reference TEXT,
      typed_full_name         TEXT,
      ip_address              INET,
      signed_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (settlement_agreement_id, signer_id)
    );
  `);

  // 3.9 dispute_documents
  pgm.sql(`
    CREATE TYPE document_type AS ENUM (
      'evidence', 'tenancy_agreement', 'notice', 'payment_proof',
      'settlement_agreement', 'rent_authority_bundle', 'other'
    );

    CREATE TABLE dispute_documents (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dispute_id      UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
      uploaded_by_id  UUID REFERENCES users(id),
      doc_type        document_type NOT NULL DEFAULT 'evidence',
      file_name       TEXT NOT NULL,
      file_path       TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_dispute_documents_dispute ON dispute_documents(dispute_id);
    CREATE INDEX idx_dispute_documents_type ON dispute_documents(doc_type);
  `);

  // 3.10 case_status_history
  pgm.sql(`
    CREATE TABLE case_status_history (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dispute_id    UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
      from_status   case_status,
      to_status     case_status NOT NULL,
      changed_by_id UUID REFERENCES users(id),
      reason        TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_case_status_history_dispute ON case_status_history(dispute_id);
  `);

  // 3.11 rent_authority_bundles
  pgm.sql(`
    CREATE TABLE rent_authority_bundles (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dispute_id            UUID NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE CASCADE,
      mediation_summary_text TEXT,
      included_document_ids JSONB NOT NULL DEFAULT '[]',
      pdf_path              TEXT NOT NULL,
      generated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // 3.12 notifications
  pgm.sql(`
    CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'whatsapp', 'in_app');

    CREATE TABLE notifications (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id),
      dispute_id  UUID REFERENCES disputes(id) ON DELETE CASCADE,
      channel     notification_channel NOT NULL,
      event_type  TEXT NOT NULL,
      payload     JSONB NOT NULL DEFAULT '{}',
      sent_at     TIMESTAMPTZ,
      read_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);
  `);
};

exports.down = (pgm) => {
  // Simplistic drop all for MVP
  pgm.sql(`
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS rent_authority_bundles CASCADE;
    DROP TABLE IF EXISTS case_status_history CASCADE;
    DROP TABLE IF EXISTS dispute_documents CASCADE;
    DROP TABLE IF EXISTS settlement_signatures CASCADE;
    DROP TABLE IF EXISTS settlement_agreements CASCADE;
    DROP TABLE IF EXISTS mediation_sessions CASCADE;
    DROP TABLE IF EXISTS messages CASCADE;
    DROP TABLE IF EXISTS negotiation_offers CASCADE;
    DROP TABLE IF EXISTS disputes CASCADE;
    DROP TABLE IF EXISTS mediator_profiles CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    
    DROP TYPE IF EXISTS notification_channel CASCADE;
    DROP TYPE IF EXISTS document_type CASCADE;
    DROP TYPE IF EXISTS signature_method CASCADE;
    DROP TYPE IF EXISTS signer_role CASCADE;
    DROP TYPE IF EXISTS agreement_status CASCADE;
    DROP TYPE IF EXISTS resolution_stage CASCADE;
    DROP TYPE IF EXISTS session_status CASCADE;
    DROP TYPE IF EXISTS session_type CASCADE;
    DROP TYPE IF EXISTS message_visibility CASCADE;
    DROP TYPE IF EXISTS message_type CASCADE;
    DROP TYPE IF EXISTS offer_status CASCADE;
    DROP TYPE IF EXISTS case_status CASCADE;
    DROP TYPE IF EXISTS dispute_category CASCADE;
    DROP TYPE IF EXISTS mediator_status CASCADE;
    DROP TYPE IF EXISTS user_role CASCADE;
  `);
};
