const express = require('express');
const router = express.Router();

const Dispute = require('../models/Dispute');
const Mediation = require('../models/Mediation');
const { authenticate, authorize } = require('../middleware/auth');

function getPartyRole(dispute, userId) {
  if (dispute.filed_by_id === userId) return 'tenant_or_landlord_filer';
  if (dispute.opposing_party_id === userId) return 'tenant_or_landlord_opposing';
  return null;
}

// POST /api/mediation/:disputeId/assign - admin assigns a mediator
router.post('/:disputeId/assign', authenticate, authorize('admin'), (req, res) => {
  const dispute = Dispute.findById(req.params.disputeId);
  if (!dispute) return res.status(404).json({ error: 'Case not found.' });

  const { mediatorId } = req.body;
  if (!mediatorId) return res.status(400).json({ error: 'mediatorId is required.' });

  const updated = Dispute.assignMediator(dispute.id, mediatorId, req.user.id);
  res.json({ dispute: updated });
});

// POST /api/mediation/:disputeId/sessions - mediator creates/updates a mediation session
router.post('/:disputeId/sessions', authenticate, authorize('mediator', 'admin'), (req, res) => {
  const dispute = Dispute.findById(req.params.disputeId);
  if (!dispute) return res.status(404).json({ error: 'Case not found.' });
  if (dispute.mediator_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the assigned mediator can manage this case.' });
  }

  const { sessionDate, sessionNotes, proposedResolution } = req.body;
  const session = Mediation.createSession({
    disputeId: dispute.id,
    mediatorId: req.user.id,
    sessionDate,
    sessionNotes,
    proposedResolution
  });

  Dispute.updateStatus(dispute.id, 'Mediation', 'Mediation session scheduled/updated.', req.user.id);

  res.status(201).json({ session });
});

// GET /api/mediation/:disputeId/sessions - list sessions for a case
router.get('/:disputeId/sessions', authenticate, (req, res) => {
  const dispute = Dispute.findById(req.params.disputeId);
  if (!dispute) return res.status(404).json({ error: 'Case not found.' });
  if (!Dispute.isParticipant(dispute, req.user.id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You do not have access to this case.' });
  }

  res.json({ sessions: Mediation.findByDispute(dispute.id) });
});

// PATCH /api/mediation/sessions/:sessionId - mediator updates notes/proposed resolution
router.patch('/sessions/:sessionId', authenticate, authorize('mediator', 'admin'), (req, res) => {
  const session = Mediation.findById(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const updated = Mediation.updateNotes(session.id, req.body);
  res.json({ session: updated });
});

// POST /api/mediation/sessions/:sessionId/decision - tenant/landlord accepts or rejects proposed resolution
router.post('/sessions/:sessionId/decision', authenticate, authorize('tenant', 'landlord'), (req, res) => {
  const session = Mediation.findById(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const dispute = Dispute.findById(session.dispute_id);
  if (!Dispute.isParticipant(dispute, req.user.id)) {
    return res.status(403).json({ error: 'You are not a party to this case.' });
  }

  const { decision } = req.body; // 'Accepted' | 'Rejected'
  if (!['Accepted', 'Rejected'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be Accepted or Rejected.' });
  }

  const party = req.user.role; // tenant or landlord
  const updated = Mediation.recordDecision(session.id, party, decision);

  if (updated.final_decision === 'Resolved') {
    Dispute.updateStatus(dispute.id, 'Resolved', 'Both parties accepted the proposed resolution.', req.user.id);
  } else if (updated.final_decision === 'Escalated') {
    Dispute.updateStatus(dispute.id, 'Escalated', 'A party rejected the proposed resolution; case escalated for legal review.', req.user.id);
  }

  res.json({ session: updated });
});

module.exports = router;
