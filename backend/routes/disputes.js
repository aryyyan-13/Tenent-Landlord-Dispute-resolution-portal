const express = require('express');
const router = express.Router();

const Dispute = require('../models/Dispute');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const CATEGORIES = ['security_deposit', 'rent_payment', 'maintenance', 'property_damage', 'agreement_violation', 'eviction_notice', 'other'];

async function serializeDispute(dispute) {
  const filedBy = await User.findById(dispute.filed_by_id);
  const opposingParty = await User.findById(dispute.opposing_party_id);
  const mediator = dispute.mediator_id ? await User.findById(dispute.mediator_id) : null;
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
router.post('/', authenticate, authorize('tenant', 'landlord'), upload.array('evidence', 5), async (req, res) => {
  try {
    // The frontend sends: title, description, category, amount, property_address, respondent_name, respondent_email, respondent_role
    const { category, description, title, amount, property_address, respondent_email, respondent_name, respondent_role } = req.body;

    if (!category || !description || !respondent_email) {
      return res.status(400).json({ error: 'Category, description, and opposing party email are required.' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Category must be one of: ${CATEGORIES.join(', ')}` });
    }

    let opposingParty = await User.findByEmail(respondent_email);
    if (!opposingParty) {
      // Auto-create a shell/placeholder account for the opposing party
      if (!respondent_name || !respondent_role) {
        return res.status(400).json({ error: 'Respondent name and role are required to invite a new user.' });
      }
      opposingParty = await User.create({
        name: respondent_name,
        email: respondent_email,
        password: 'PENDING_INVITE_' + Math.random().toString(36), // They will need to reset password/register
        role: respondent_role
      });
      // In a real app, we would send an invitation email here.
    }

    if (opposingParty.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot file a dispute against yourself.' });
    }

    const dispute = await Dispute.create({
      filedById: req.user.id,
      opposingPartyId: opposingParty.id,
      category,
      description: `[${title}] ${description}`,
      desiredOutcome: amount ? `Claim: $${amount}` : null,
      propertyAddress: property_address || 'Unknown Address'
    });

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await Dispute.addDocument(dispute.id, req.user.id, file.originalname, `/uploads/${file.filename}`, 'evidence');
      }
    }

    const serialized = await serializeDispute(await Dispute.findById(dispute.id));
    res.status(201).json({ dispute: serialized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to file dispute.', details: err.message });
  }
});

// GET /api/disputes - list disputes visible to current user
router.get('/', authenticate, async (req, res) => {
  try {
    const disputes = req.user.role === 'admin' ? await Dispute.findAll() : await Dispute.findForUser(req.user.id);
    const serialized = await Promise.all(disputes.map(serializeDispute));
    res.json({ disputes: serialized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/disputes/:id - full case detail (includes resolution + escalation metadata)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Case not found.' });
    if (!assertAccess(req, res, dispute)) return;

    const timeline  = await Dispute.getTimeline(dispute.id);
    const documents = await Dispute.getDocuments(dispute.id);

    // Attach settlement agreement (pdf_path) when present
    let settlementAgreement = null;
    if (dispute.settlement_agreement_id) {
      const { pool } = require('../config/db');
      const saRes = await pool.query(
        'SELECT id, status, generated_pdf_path, terms_text, compliance_deadline FROM settlement_agreements WHERE id = $1',
        [dispute.settlement_agreement_id]
      );
      settlementAgreement = saRes.rows[0] || null;
    }

    const serialized = await serializeDispute(dispute);
    res.json({
      dispute: {
        ...serialized,
        resolution_type:       dispute.resolution_type,
        escalated_reason:      dispute.escalated_reason,
        escalated_at:          dispute.escalated_at,
        settlement_agreement:  settlementAgreement,
      },
      timeline,
      documents,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/disputes/:id/status - mediator/admin updates status
router.patch('/:id/status', authenticate, authorize('mediator', 'admin'), async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Case not found.' });
    if (!assertAccess(req, res, dispute)) return;

    const { status, note } = req.body;
    const VALID_STATUSES = ['open_negotiation', 'open_mediation', 'resolved_settlement_negotiation', 'resolved_settlement_mediation', 'mediation_failed', 'closed_referred_rent_authority', 'closed_withdrawn', 'closed_no_response'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const updated = await Dispute.updateStatus(dispute.id, status, note, req.user.id);
    res.json({ dispute: await serializeDispute(updated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/disputes/:id/documents - upload additional documents
router.post('/:id/documents', authenticate, upload.array('files', 5), async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Case not found.' });
    if (!assertAccess(req, res, dispute)) return;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const docs = [];
    for (const file of req.files) {
      const doc = await Dispute.addDocument(dispute.id, req.user.id, file.originalname, `/uploads/${file.filename}`, req.body.label || 'other');
      docs.push(doc);
    }

    res.status(201).json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/disputes/:id/messages - structured communication thread
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Case not found.' });
    if (!assertAccess(req, res, dispute)) return;

    const messages = await Dispute.getMessages(dispute.id);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/disputes/:id/messages - send a message on the case
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Case not found.' });
    if (!assertAccess(req, res, dispute)) return;

    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Message body cannot be empty.' });
    }

    const message = await Dispute.addMessage(dispute.id, req.user.id, body.trim());
    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
