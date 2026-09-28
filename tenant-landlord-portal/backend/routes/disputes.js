const express = require('express');
const router = express.Router();

const Dispute = require('../models/Dispute');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const CATEGORIES = ['Security Deposit', 'Rent Payment', 'Maintenance', 'Property Damage', 'Agreement Violation'];

function serializeDispute(dispute) {
  const filedBy = User.findById(dispute.filed_by_id);
  const opposingParty = User.findById(dispute.opposing_party_id);
  const mediator = dispute.mediator_id ? User.findById(dispute.mediator_id) : null;
  return {
    ...dispute,
    filed_by: filedBy ? { id: filedBy.id, name: filedBy.name, role: filedBy.role } : null,
    opposing_party: opposingParty ? { id: opposingParty.id, name: opposingParty.name, role: opposingParty.role } : null,
    mediator: mediator ? { id: mediator.id, name: mediator.name } : null
  };
}

function assertAccess(req, res, dispute) {
  const isAdmin = req.user.role === 'admin';
  const isParticipant = Dispute.isParticipant(dispute, req.user.id);
  if (!isAdmin && !isParticipant) {
    res.status(403).json({ error: 'You do not have access to this case.' });
    return false;
  }
  return true;
}

// POST /api/disputes - file a new dispute (tenant or landlord)
router.post('/', authenticate, authorize('tenant', 'landlord'), upload.array('evidence', 5), (req, res) => {
  try {
    const { category, description, opposingPartyEmail } = req.body;

    if (!category || !description || !opposingPartyEmail) {
      return res.status(400).json({ error: 'Category, description, and opposing party email are required.' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Category must be one of: ${CATEGORIES.join(', ')}` });
    }

    const opposingParty = User.findByEmail(opposingPartyEmail);
    if (!opposingParty) {
      return res.status(404).json({ error: 'Opposing party not found. They must be a registered user.' });
    }
    if (opposingParty.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot file a dispute against yourself.' });
    }

    const dispute = Dispute.create({
      filedById: req.user.id,
      opposingPartyId: opposingParty.id,
      category,
      description
    });

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        Dispute.addDocument(dispute.id, req.user.id, file.originalname, `/uploads/${file.filename}`, 'evidence');
      });
    }

    res.status(201).json({ dispute: serializeDispute(Dispute.findById(dispute.id)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to file dispute.', details: err.message });
  }
});

// GET /api/disputes - list disputes visible to current user
router.get('/', authenticate, (req, res) => {
  const disputes = req.user.role === 'admin' ? Dispute.findAll() : Dispute.findForUser(req.user.id);
  res.json({ disputes: disputes.map(serializeDispute) });
});

// GET /api/disputes/:id - full case detail
router.get('/:id', authenticate, (req, res) => {
  const dispute = Dispute.findById(req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Case not found.' });
  if (!assertAccess(req, res, dispute)) return;

  res.json({
    dispute: serializeDispute(dispute),
    timeline: Dispute.getTimeline(dispute.id),
    documents: Dispute.getDocuments(dispute.id)
  });
});

// PATCH /api/disputes/:id/status - mediator/admin updates status
router.patch('/:id/status', authenticate, authorize('mediator', 'admin'), (req, res) => {
  const dispute = Dispute.findById(req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Case not found.' });
  if (!assertAccess(req, res, dispute)) return;

  const { status, note } = req.body;
  const VALID_STATUSES = ['Filed', 'Under Review', 'Mediation', 'Resolved', 'Escalated', 'Closed'];
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const updated = Dispute.updateStatus(dispute.id, status, note, req.user.id);
  res.json({ dispute: serializeDispute(updated) });
});

// POST /api/disputes/:id/documents - upload additional documents
router.post('/:id/documents', authenticate, upload.array('files', 5), (req, res) => {
  const dispute = Dispute.findById(req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Case not found.' });
  if (!assertAccess(req, res, dispute)) return;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  const docs = req.files.map(file =>
    Dispute.addDocument(dispute.id, req.user.id, file.originalname, `/uploads/${file.filename}`, req.body.label || 'supporting document')
  );

  res.status(201).json({ documents: docs });
});

// GET /api/disputes/:id/messages - structured communication thread
router.get('/:id/messages', authenticate, (req, res) => {
  const dispute = Dispute.findById(req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Case not found.' });
  if (!assertAccess(req, res, dispute)) return;

  res.json({ messages: Dispute.getMessages(dispute.id) });
});

// POST /api/disputes/:id/messages - send a message on the case
router.post('/:id/messages', authenticate, (req, res) => {
  const dispute = Dispute.findById(req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Case not found.' });
  if (!assertAccess(req, res, dispute)) return;

  const { body } = req.body;
  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'Message body cannot be empty.' });
  }

  const message = Dispute.addMessage(dispute.id, req.user.id, body.trim());
  res.status(201).json({ message });
});

module.exports = router;
