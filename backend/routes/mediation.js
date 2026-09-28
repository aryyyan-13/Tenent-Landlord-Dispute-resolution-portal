const express = require('express');
const router = express.Router();

const Dispute = require('../models/Dispute');
const Mediation = require('../models/Mediation');
const { authenticate, authorize } = require('../middleware/auth');
const { validateProposedResolution } = require('../validators/proposedResolutionSchema');
const { renderObligationsAsText } = require('../utils/renderObligations');

// ─── POST /api/mediation/:disputeId/assign ─────────────────────────────────
// Admin assigns a mediator to a dispute
router.post('/:disputeId/assign', authenticate, authorize('admin'), async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.disputeId);
    if (!dispute) return res.status(404).json({ error: 'Case not found.' });

    const { mediatorId } = req.body;
    if (!mediatorId) return res.status(400).json({ error: 'mediatorId is required.' });

    const updated = await Dispute.assignMediator(dispute.id, mediatorId, req.user.id);
    res.json({ dispute: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/mediation/:disputeId/sessions ──────────────────────────────
// Mediator creates a session (optionally with a structured proposed resolution)
router.post('/:disputeId/sessions', authenticate, authorize('mediator', 'admin'), async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.disputeId);
    if (!dispute) return res.status(404).json({ error: 'Case not found.' });
    if (dispute.mediator_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the assigned mediator can manage this case.' });
    }

    const { sessionDate, sessionNotes, proposedResolutionJson } = req.body;

    let proposedResolutionText = null;
    if (proposedResolutionJson) {
      const validationError = validateProposedResolution(proposedResolutionJson);
      if (validationError) return res.status(400).json({ error: validationError });
      proposedResolutionText = renderObligationsAsText(proposedResolutionJson);
    }

    const session = await Mediation.createSession({
      disputeId: dispute.id,
      mediatorId: req.user.id,
      sessionDate,
      sessionNotes,
      proposedResolution: proposedResolutionText,
      proposedResolutionJson,
    });

    // Only bump status if not already in or past mediation
    if (dispute.case_status === 'open_negotiation') {
      await Dispute.updateStatus(dispute.id, 'open_mediation', 'Mediation session created.', req.user.id);
    }

    res.status(201).json({ session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/mediation/:disputeId/sessions ───────────────────────────────
router.get('/:disputeId/sessions', authenticate, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.disputeId);
    if (!dispute) return res.status(404).json({ error: 'Case not found.' });
    if (!Dispute.isParticipant(dispute, req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have access to this case.' });
    }

    const sessions = await Mediation.findByDispute(dispute.id);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/mediation/sessions/:sessionId ────────────────────────────
// Mediator updates session notes / proposed resolution
router.patch('/sessions/:sessionId', authenticate, authorize('mediator', 'admin'), async (req, res) => {
  try {
    const session = await Mediation.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    const { sessionDate, sessionNotes, proposedResolutionJson } = req.body;

    let proposedResolutionText = null;
    if (proposedResolutionJson) {
      const validationError = validateProposedResolution(proposedResolutionJson);
      if (validationError) return res.status(400).json({ error: validationError });
      proposedResolutionText = renderObligationsAsText(proposedResolutionJson);
    }

    const updated = await Mediation.updateNotes(session.id, {
      sessionDate,
      sessionNotes,
      proposedResolution: proposedResolutionText,
      proposedResolutionJson,
    });
    res.json({ session: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/mediation/sessions/:sessionId/decision ────────────────────
// Tenant or landlord accepts/rejects the proposed resolution.
// Authorization: caller must be a party to the dispute AND the `party` field
// in the body must match their actual role on this dispute.
router.post('/sessions/:sessionId/decision', authenticate, authorize('tenant', 'landlord'), async (req, res) => {
  try {
    const session = await Mediation.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    const { decision, party } = req.body;

    if (!['Accepted', 'Rejected'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be "Accepted" or "Rejected".' });
    }
    if (!['tenant', 'landlord'].includes(party)) {
      return res.status(400).json({ error: 'party must be "tenant" or "landlord".' });
    }

    const result = await Mediation.recordDecision(session.id, party, decision, req.user.id);
    res.json(result);
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// ─── POST /api/mediation/:disputeId/escalate ─────────────────────────────
// Manual escalation by the assigned mediator or admin.
// Body: { reason: string }
router.post('/:disputeId/escalate', authenticate, authorize('mediator', 'admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await Mediation.manualEscalate(
      req.params.disputeId,
      req.user.id,
      req.user.role,
      reason || ''
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
