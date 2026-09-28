const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const db = require('../config/db');
const Dispute = require('./Dispute');
const { generateSettlementPdf } = require('../utils/generateSettlementPdf');
const { BundleGeneratorService } = require('../utils/bundleGenerator');
const User = require('./User');

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Ensures the calling user is the correct party for the decision they are
 * recording (e.g. a tenant cannot submit `party: 'landlord'`).
 *
 * Maps the *dispute's* filed_by_id / opposing_party_id to the roles stored
 * on those user accounts, then checks both that the caller is a participant
 * AND that the `party` string they supplied matches their actual role.
 *
 * @throws {Error} 403-tagged error if mismatch
 */
async function assertIsPartyForDecision(dispute, party, userId) {
  const filedBy   = await User.findById(dispute.filed_by_id);
  const opposing  = await User.findById(dispute.opposing_party_id);

  const callerIsFiledBy   = dispute.filed_by_id       === userId;
  const callerIsOpposing  = dispute.opposing_party_id  === userId;

  if (!callerIsFiledBy && !callerIsOpposing) {
    const err = new Error('You are not a party to this case.');
    err.status = 403;
    throw err;
  }

  // Derive which role the caller actually occupies on this dispute
  const callerUser = callerIsFiledBy ? filedBy : opposing;
  if (!callerUser || callerUser.role !== party) {
    const err = new Error(
      `Your role on this dispute is "${callerUser?.role}" — you cannot submit a "${party}" decision.`
    );
    err.status = 403;
    throw err;
  }
}

/**
 * Looks up the settlement_signature row for this session + role combination.
 * Returns the row or undefined.
 */
async function findSignature(client, sessionId, party) {
  // Signatures are keyed on (settlement_agreement_id, signer_id) but for
  // the decision lookup we need to find by session context. We store the
  // session_id as a reference via the settlement_agreement.dispute_id path.
  // Simpler: we track decisions directly on settlement_signatures via a
  // session-level lookup on signer_role. We join through dispute_id.
  const res = await client.query(
    `SELECT ss.*
     FROM settlement_signatures ss
     JOIN settlement_agreements sa ON sa.id = ss.settlement_agreement_id
     JOIN mediation_sessions ms    ON ms.dispute_id = sa.dispute_id
     WHERE ms.id = $1 AND ss.signer_role = $2
     LIMIT 1`,
    [sessionId, party]
  );
  return res.rows[0];
}

/**
 * Upserts (or creates) the settlement_agreement for this session's dispute,
 * then records / updates the party's signature/decision row.
 */
async function upsertDecision(client, session, party, userId, decision) {
  // 1. Find or create settlement_agreement
  let saRes = await client.query(
    `SELECT id FROM settlement_agreements WHERE dispute_id = $1 LIMIT 1`,
    [session.dispute_id]
  );
  let saId;
  if (saRes.rows.length === 0) {
    saId = uuidv4();
    await client.query(
      `INSERT INTO settlement_agreements (id, dispute_id, resolution_stage, terms_text, status, created_by_id)
       VALUES ($1, $2, 'mediation', $3, 'pending_signatures', $4)`,
      [saId, session.dispute_id, session.proposed_resolution || 'Pending parties\' decisions.', session.mediator_id]
    );
  } else {
    saId = saRes.rows[0].id;
  }

  // 2. Upsert signature / decision (ON CONFLICT updates the decision)
  await client.query(
    `INSERT INTO settlement_signatures
       (id, settlement_agreement_id, signer_id, signer_role, signature_method, decision, decided_at)
     VALUES ($1, $2, $3, $4, 'otp_checkbox', $5, now())
     ON CONFLICT (settlement_agreement_id, signer_id)
     DO UPDATE SET decision = EXCLUDED.decision, decided_at = EXCLUDED.decided_at`,
    [uuidv4(), saId, userId, party, decision]
  );

  return saId;
}

/** Resolves the case as a settled mediation — generates PDF, flips status. */
async function resolveBySettlement(client, dispute, session) {
  // Fetch party details for PDF
  const [tenantRow, landlordRow] = await Promise.all([
    User.findById(dispute.filed_by_id),
    User.findById(dispute.opposing_party_id),
  ]);

  // Determine who is actually tenant vs landlord on this dispute
  const tenant   = tenantRow?.role === 'tenant'   ? tenantRow   : landlordRow;
  const landlord = tenantRow?.role === 'landlord'  ? tenantRow   : landlordRow;

  const mediatorRow = dispute.mediator_id ? await User.findById(dispute.mediator_id) : null;

  const { publicPath: pdfUrl } = await generateSettlementPdf({
    caseNumber:      dispute.case_number,
    tenant:          { name: tenant?.name || 'Tenant',   contact: tenant?.contact },
    landlord:        { name: landlord?.name || 'Landlord', contact: landlord?.contact },
    propertyAddress: dispute.property_address,
    disputeSummary:  dispute.description,
    obligationsText: session.proposed_resolution || 'Terms as agreed in mediation session.',
    mediatorName:    mediatorRow?.name || 'Mediator',
  });

  // Update settlement_agreement to fully_signed + store PDF
  const saRes = await client.query(
    `SELECT id FROM settlement_agreements WHERE dispute_id = $1 LIMIT 1`,
    [dispute.id]
  );
  if (saRes.rows.length > 0) {
    await client.query(
      `UPDATE settlement_agreements
       SET status = 'fully_signed', generated_pdf_path = $1, updated_at = now()
       WHERE id = $2`,
      [pdfUrl, saRes.rows[0].id]
    );
    // Link back on disputes
    await client.query(
      `UPDATE disputes
       SET resolution_type = 'settlement',
           settlement_agreement_id = $1,
           updated_at = now()
       WHERE id = $2`,
      [saRes.rows[0].id, dispute.id]
    );
  }

  // Status transition with audit row — re-use Dispute.addTimelineEntry directly
  await client.query(
    `UPDATE disputes SET case_status = 'resolved_settlement_mediation', updated_at = now() WHERE id = $1`,
    [dispute.id]
  );
  await client.query(
    `INSERT INTO case_status_history (id, dispute_id, from_status, to_status, reason, changed_by_id)
     VALUES ($1, $2, $3, 'resolved_settlement_mediation', 'Both parties accepted the proposed resolution.', $4)`,
    [uuidv4(), dispute.id, dispute.case_status, session.mediator_id]
  );

  const updatedDispute = await client.query('SELECT * FROM disputes WHERE id = $1', [dispute.id]);
  return {
    outcome: 'Resolved',
    dispute: updatedDispute.rows[0],
    settlementPdfUrl: pdfUrl,
  };
}

/** Escalates the case on rejection — generates bundle, flips status. */
async function escalateByRejection(client, dispute, session) {
  await client.query(
    `UPDATE disputes
     SET resolution_type   = 'escalation',
         escalated_reason  = 'party_rejected_proposal',
         escalated_at      = now(),
         updated_at        = now()
     WHERE id = $1`,
    [dispute.id]
  );

  await client.query(
    `UPDATE disputes SET case_status = 'mediation_failed', updated_at = now() WHERE id = $1`,
    [dispute.id]
  );
  await client.query(
    `INSERT INTO case_status_history (id, dispute_id, from_status, to_status, reason, changed_by_id)
     VALUES ($1, $2, $3, 'mediation_failed', 'A party rejected the proposed resolution.', $4)`,
    [uuidv4(), dispute.id, dispute.case_status, session.mediator_id]
  );

  // Bundle generation runs outside the transaction (file I/O)
  // We commit first, then generate — acceptable because bundle failure is
  // non-fatal (status is already correct, bundle can be re-generated).
  const updatedDispute = await client.query('SELECT * FROM disputes WHERE id = $1', [dispute.id]);

  return { dispute: updatedDispute.rows[0] };
}

// ─── Public model ──────────────────────────────────────────────────────────

const Mediation = {
  async createSession({ disputeId, mediatorId, sessionDate, sessionNotes, proposedResolution, proposedResolutionJson }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO mediation_sessions
         (id, dispute_id, mediator_id, scheduled_at, session_notes, proposed_resolution, proposed_resolution_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id, disputeId, mediatorId,
        sessionDate || null,
        sessionNotes || null,
        proposedResolution || null,
        proposedResolutionJson ? JSON.stringify(proposedResolutionJson) : null,
      ]
    );
    return Mediation.findById(id);
  },

  async findById(id) {
    const res = await db.query('SELECT * FROM mediation_sessions WHERE id = $1', [id]);
    return res.rows[0];
  },

  async findByDispute(disputeId) {
    const res = await db.query(
      `SELECT ms.*, u.name AS mediator_name
       FROM mediation_sessions ms
       LEFT JOIN users u ON u.id = ms.mediator_id
       WHERE ms.dispute_id = $1
       ORDER BY ms.created_at DESC`,
      [disputeId]
    );
    return res.rows;
  },

  async updateNotes(id, { sessionDate, sessionNotes, proposedResolution, proposedResolutionJson }) {
    await db.query(
      `UPDATE mediation_sessions
       SET scheduled_at            = COALESCE($1, scheduled_at),
           session_notes           = COALESCE($2, session_notes),
           proposed_resolution     = COALESCE($3, proposed_resolution),
           proposed_resolution_json = COALESCE($4, proposed_resolution_json),
           updated_at              = now()
       WHERE id = $5`,
      [
        sessionDate || null,
        sessionNotes || null,
        proposedResolution || null,
        proposedResolutionJson ? JSON.stringify(proposedResolutionJson) : null,
        id,
      ]
    );
    return Mediation.findById(id);
  },

  /**
   * Records a party's Accept/Reject decision with:
   *  - SELECT ... FOR UPDATE row lock (prevents concurrent double-processing)
   *  - Idempotency check (same party submitting twice is safe)
   *  - Correct party-role authorization (caller's role must match `party`)
   *
   * Returns { outcome, dispute, settlementPdfUrl? | caseBundleUrl? }
   */
  async recordDecision(sessionId, party, decision, userId) {
    const client = await pool.connect();
    let bundleDispute = null;

    try {
      await client.query('BEGIN');

      // Row lock — second concurrent request waits here until first commits
      const sessionRes = await client.query(
        `SELECT * FROM mediation_sessions WHERE id = $1 FOR UPDATE`,
        [sessionId]
      );
      const session = sessionRes.rows[0];
      if (!session) {
        const err = new Error('Session not found.');
        err.status = 404;
        throw err;
      }

      const disputeRes = await client.query(
        `SELECT * FROM disputes WHERE id = $1 FOR UPDATE`,
        [session.dispute_id]
      );
      const dispute = disputeRes.rows[0];

      // Authorization: party must match caller's actual role on this dispute
      await assertIsPartyForDecision(dispute, party, userId);

      // Idempotency: if this party already decided, return that decision unchanged
      const existing = await findSignature(client, sessionId, party);
      if (existing?.decision) {
        await client.query('COMMIT');
        return {
          outcome: 'AlreadyRecorded',
          message: `Your ${party} decision (${existing.decision}) was already recorded.`,
        };
      }

      // Record the decision
      await upsertDecision(client, session, party, userId, decision);

      // Read both parties' current decisions
      const tenantSig   = await findSignature(client, sessionId, 'tenant');
      const landlordSig = await findSignature(client, sessionId, 'landlord');

      let result;

      if (tenantSig?.decision === 'Accepted' && landlordSig?.decision === 'Accepted') {
        result = await resolveBySettlement(client, dispute, session);
      } else if (tenantSig?.decision === 'Rejected' || landlordSig?.decision === 'Rejected') {
        // Store dispute for bundle generation after commit
        const interim = await escalateByRejection(client, dispute, session);
        bundleDispute = interim.dispute;
        result = { outcome: 'Escalated (pending bundle)', dispute: bundleDispute };
      } else {
        // Only one party has decided so far
        result = {
          outcome: 'Pending',
          session: { id: session.id, tenant_decision: tenantSig?.decision || null, landlord_decision: landlordSig?.decision || null },
        };
      }

      await client.query('COMMIT');

      // Bundle generation happens after commit (file I/O outside transaction)
      if (bundleDispute) {
        try {
          const bundle = await BundleGeneratorService.generate(bundleDispute.id, { reason: 'party_rejected_proposal' });
          result.outcome = 'Escalated';
          result.caseBundleUrl = bundle.publicPath;
        } catch (bundleErr) {
          console.error('[BundleGenerator] Failed to generate bundle:', bundleErr.message);
          result.outcome = 'Escalated';
          result.caseBundleUrl = null;
          result.bundleError = 'Bundle generation failed — case status is correct; bundle can be regenerated.';
        }
      }

      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Manual escalation — callable by assigned mediator or admin only.
   * Transitions the case to mediation_failed with the supplied reason code,
   * generates a case bundle, and returns the result.
   */
  async manualEscalate(disputeId, actorId, actorRole, reasonText) {
    const client = await pool.connect();
    let bundleDispute = null;

    try {
      await client.query('BEGIN');

      const disputeRes = await client.query(
        `SELECT * FROM disputes WHERE id = $1 FOR UPDATE`,
        [disputeId]
      );
      const dispute = disputeRes.rows[0];
      if (!dispute) {
        const err = new Error('Case not found.');
        err.status = 404;
        throw err;
      }

      // Authorization: must be assigned mediator or admin
      if (actorRole !== 'admin' && dispute.mediator_id !== actorId) {
        const err = new Error('Only the assigned mediator or an admin can manually escalate this case.');
        err.status = 403;
        throw err;
      }

      // Must be in mediation to manually escalate
      if (!['open_mediation', 'open_negotiation'].includes(dispute.case_status)) {
        const err = new Error(`Cannot escalate a case with status "${dispute.case_status}".`);
        err.status = 400;
        throw err;
      }

      const escalatedReason = actorRole === 'admin'
        ? 'manually_escalated_by_admin'
        : 'manually_escalated_by_mediator';

      // Append note to the latest session (or create a standalone note)
      if (reasonText) {
        await client.query(
          `UPDATE mediation_sessions
           SET session_notes = COALESCE(session_notes, '') || $1,
               updated_at    = now()
           WHERE dispute_id = $2 AND mediator_id = $3
           ORDER BY created_at DESC
           LIMIT 1`,
          [`\n[ESCALATION NOTE] ${reasonText}`, disputeId, actorId]
        );
      }

      await client.query(
        `UPDATE disputes
         SET resolution_type  = 'escalation',
             escalated_reason = $1,
             escalated_at     = now(),
             case_status      = 'mediation_failed',
             updated_at       = now()
         WHERE id = $2`,
        [escalatedReason, disputeId]
      );

      await client.query(
        `INSERT INTO case_status_history (id, dispute_id, from_status, to_status, reason, changed_by_id)
         VALUES ($1, $2, $3, 'mediation_failed', $4, $5)`,
        [uuidv4(), disputeId, dispute.case_status, reasonText || escalatedReason, actorId]
      );

      const updatedRes = await client.query('SELECT * FROM disputes WHERE id = $1', [disputeId]);
      bundleDispute = updatedRes.rows[0];

      await client.query('COMMIT');

      // Generate bundle outside transaction
      let caseBundleUrl = null;
      try {
        const bundle = await BundleGeneratorService.generate(disputeId, { reason: escalatedReason });
        caseBundleUrl = bundle.publicPath;
      } catch (bundleErr) {
        console.error('[BundleGenerator] Manual escalation bundle failed:', bundleErr.message);
      }

      return {
        outcome: 'Escalated',
        dispute: bundleDispute,
        caseBundleUrl,
        escalatedReason,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = Mediation;
