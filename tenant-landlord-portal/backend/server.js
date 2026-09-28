require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./config/db'); // initializes schema on load

const authRoutes = require('./routes/auth');
const disputeRoutes = require('./routes/disputes');
const mediationRoutes = require('./routes/mediation');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (KYC docs, evidence, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Tenant-Landlord Dispute Resolution Portal API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/mediation', mediationRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Central error handler (e.g. multer errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`TLDRP API server running on http://localhost:${PORT}`);
});
