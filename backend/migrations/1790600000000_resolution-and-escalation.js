/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // ── 1. mediation_sessions: structured resolution JSON ──
  pgm.sql(`
    ALTER TABLE mediation_sessions
      ADD COLUMN IF NOT EXISTS proposed_resolution_json JSONB;
  `);

  // ── 2. disputes: resolution/escalation tracking ──
  pgm.sql(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS resolution_type TEXT
        CHECK (resolution_type IN ('settlement', 'escalation') OR resolution_type IS NULL),
      ADD COLUMN IF NOT EXISTS settlement_agreement_id UUID
        REFERENCES settlement_agreements(id),
      ADD COLUMN IF NOT EXISTS escalated_reason TEXT
        CHECK (
          escalated_reason IN (
            'party_rejected_proposal',
            'manually_escalated_by_mediator',
            'manually_escalated_by_admin'
          ) OR escalated_reason IS NULL
        ),
      ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
  `);

  // ── 3. settlement_signatures: per-party decision capture ──
  pgm.sql(`
    ALTER TABLE settlement_signatures
      ADD COLUMN IF NOT EXISTS decision TEXT
        CHECK (decision IN ('Accepted', 'Rejected') OR decision IS NULL),
      ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
  `);

  // ── 4. Ensure indexes exist (idempotent) ──
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_disputes_case_status       ON disputes(case_status);
    CREATE INDEX IF NOT EXISTS idx_disputes_filed_by_id       ON disputes(filed_by_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_opposing_party_id ON disputes(opposing_party_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_mediator_id       ON disputes(mediator_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_resolution_type   ON disputes(resolution_type) WHERE resolution_type IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_disputes_escalated_at      ON disputes(escalated_at)    WHERE escalated_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_mediation_sessions_dispute_id ON mediation_sessions(dispute_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE settlement_signatures
      DROP COLUMN IF EXISTS decision,
      DROP COLUMN IF EXISTS decided_at;

    ALTER TABLE disputes
      DROP COLUMN IF EXISTS resolution_type,
      DROP COLUMN IF EXISTS settlement_agreement_id,
      DROP COLUMN IF EXISTS escalated_reason,
      DROP COLUMN IF EXISTS escalated_at;

    ALTER TABLE mediation_sessions
      DROP COLUMN IF EXISTS proposed_resolution_json;

    DROP INDEX IF EXISTS idx_disputes_escalated_at;
    DROP INDEX IF EXISTS idx_disputes_resolution_type;
    DROP INDEX IF EXISTS idx_mediation_sessions_dispute_id;
  `);
};
