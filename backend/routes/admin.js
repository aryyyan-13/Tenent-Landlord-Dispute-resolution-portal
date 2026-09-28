const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Dispute = require('../models/Dispute');
const RentalAgreement = require('../models/RentalAgreement');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require the admin role
router.use(authenticate, authorize('admin'));

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/mediators
router.get('/mediators', async (req, res) => {
  try {
    const mediators = await User.findByRole('mediator');
    res.json({ mediators });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/kyc - verify or reject KYC (also handles PATCH for legacy)
router.put('/users/:id/kyc', async (req, res) => {
  try {
    // Accept either { kyc_status: 'verified'|'rejected'|'pending' } or legacy { verified: true|false }
    let verified;
    if (req.body.kyc_status !== undefined) {
      verified = req.body.kyc_status === 'verified';
    } else {
      verified = !!req.body.verified;
    }
    const user = await User.setKycVerified(req.params.id, verified);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: User.toSafeObject(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.patch('/users/:id/kyc', async (req, res) => {
  try {
    let verified;
    if (req.body.kyc_status !== undefined) {
      verified = req.body.kyc_status === 'verified';
    } else {
      verified = !!req.body.verified;
    }
    const user = await User.setKycVerified(req.params.id, verified);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: User.toSafeObject(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// PATCH /api/admin/users/:id/role - change a user's role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const VALID_ROLES = ['tenant', 'landlord', 'mediator', 'admin'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }
    const user = await User.updateRole(req.params.id, role);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: User.toSafeObject(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/disputes - all disputes, with filtering by status/category
router.get('/disputes', async (req, res) => {
  try {
    let disputes = await Dispute.findAll();
    const { status, category } = req.query;
    if (status) disputes = disputes.filter(d => d.case_status === status);
    if (category) disputes = disputes.filter(d => d.category === category);
    res.json({ disputes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats - analytics overview for the admin panel
router.get('/stats', async (req, res) => {
  try {
    const analytics = await Dispute.analytics();
    const usersCount = await User.countAll();
    res.json({
      total_cases:                analytics.totalCases,
      active_cases:               analytics.totalCases - analytics.resolvedCases - analytics.escalatedCases,
      resolved_cases:             analytics.resolvedCases,
      escalated_cases:            analytics.escalatedCases,
      escalated_awaiting_reference: analytics.escalatedAwaitingReference,
      users_count:                usersCount,
      resolution_rate:            analytics.resolutionRate,
      escalation_rate:            analytics.escalationRate,
      avg_resolution_days:        analytics.averageResolutionDays,
      by_status:                  analytics.byStatus,
      by_category:                analytics.byCategory,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await Dispute.analytics();
    res.json({ analytics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---- Rental Agreement management ----

// GET /api/admin/rental-agreements
router.get('/rental-agreements', async (req, res) => {
  try {
    const agreements = await RentalAgreement.findAll();
    res.json({ agreements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/rental-agreements - create a new agreement
router.post('/rental-agreements', async (req, res) => {
  try {
    const { tenantId, landlordId, propertyAddress, startDate, endDate } = req.body;
    if (!tenantId || !landlordId || !propertyAddress || !startDate) {
      return res.status(400).json({ error: 'tenantId, landlordId, propertyAddress, and startDate are required.' });
    }

    const tenant = await User.findById(tenantId);
    const landlord = await User.findById(landlordId);
    if (!tenant || tenant.role !== 'tenant') {
      return res.status(400).json({ error: 'tenantId must reference a user with the tenant role.' });
    }
    if (!landlord || landlord.role !== 'landlord') {
      return res.status(400).json({ error: 'landlordId must reference a user with the landlord role.' });
    }

    const agreement = await RentalAgreement.create({
      tenantId, landlordId, propertyAddress, startDate, endDate,
      createdById: req.user.id
    });
    res.status(201).json({ agreement });
  } catch (err) {
    // Postgres UNIQUE constraint violation is code 23505
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An active agreement between these parties at this address already exists.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create agreement.', details: err.message });
  }
});

// PATCH /api/admin/rental-agreements/:id/status
router.patch('/rental-agreements/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const VALID = ['active', 'expired', 'terminated'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID.join(', ')}` });
    }
    const agreement = await RentalAgreement.updateStatus(req.params.id, status);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found.' });
    res.json({ agreement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
