const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Dispute = require('../models/Dispute');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require the admin role
router.use(authenticate, authorize('admin'));

// GET /api/admin/users
router.get('/users', (req, res) => {
  res.json({ users: User.findAll() });
});

// GET /api/admin/mediators
router.get('/mediators', (req, res) => {
  res.json({ mediators: User.findByRole('mediator') });
});

// PATCH /api/admin/users/:id/kyc - verify or reject KYC
router.patch('/users/:id/kyc', (req, res) => {
  const { verified } = req.body;
  const user = User.setKycVerified(req.params.id, !!verified);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: User.toSafeObject(user) });
});

// PATCH /api/admin/users/:id/role - change a user's role
router.patch('/users/:id/role', (req, res) => {
  const { role } = req.body;
  const VALID_ROLES = ['tenant', 'landlord', 'mediator', 'admin'];
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  const user = User.updateRole(req.params.id, role);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: User.toSafeObject(user) });
});

// GET /api/admin/disputes - all disputes, with filtering by status/category
router.get('/disputes', (req, res) => {
  let disputes = Dispute.findAll();
  const { status, category } = req.query;
  if (status) disputes = disputes.filter(d => d.status === status);
  if (category) disputes = disputes.filter(d => d.category === category);
  res.json({ disputes });
});

// GET /api/admin/analytics
router.get('/analytics', (req, res) => {
  res.json({ analytics: Dispute.analytics() });
});

module.exports = router;
