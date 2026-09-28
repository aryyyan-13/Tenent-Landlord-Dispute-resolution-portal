require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./config/db'); // initializes schema on load

const authRoutes = require('./routes/auth');
const disputeRoutes = require('./routes/disputes');
const mediationRoutes = require('./routes/mediation');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');

const app = express();

// ponytail: parse comma-separated origins so LOCAL + prod both work without code changes
const allowedOrigins = (process.env.CLIENT_ORIGIN || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser clients (curl, Render health checks) and listed origins
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (KYC docs, evidence, settlements, bundles)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Tenant-Landlord Dispute Resolution Portal API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/mediation', mediationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);

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
