const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const User = {
  async create({ name, email, password, role, contact, address, kycDocumentPath }) {
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    
    await db.query(`
      INSERT INTO users (id, name, email, password_hash, role, contact, address, kyc_document_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, name, email.toLowerCase(), passwordHash, role, contact || null, address || null, kycDocumentPath || null]);
    
    return User.findById(id);
  },

  async findByEmail(email) {
    const res = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    return res.rows[0];
  },

  async findById(id) {
    const res = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0];
  },

  async findAll() {
    const res = await db.query(`
      SELECT id, name, email, role, contact, address, kyc_verified,
        CASE WHEN kyc_verified = true THEN 'verified' ELSE 'pending' END AS kyc_status,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);
    return res.rows;
  },

  async findByRole(role) {
    const res = await db.query('SELECT id, name, email, role FROM users WHERE role = $1', [role]);
    return res.rows;
  },

  verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
  },

  async setKycVerified(id, verified) {
    await db.query('UPDATE users SET kyc_verified = $1 WHERE id = $2', [verified, id]);
    return User.findById(id);
  },

  async updateRole(id, role) {
    await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    return User.findById(id);
  },

  async countAll() {
    const res = await db.query('SELECT COUNT(*) as c FROM users');
    return parseInt(res.rows[0].c, 10);
  },

  toSafeObject(user) {
    if (!user) return null;
    const { password_hash, ...safe } = user;
    // Provide kyc_status alias for the admin panel (legacy compat)
    if (safe.kyc_verified !== undefined && safe.kyc_status === undefined) {
      safe.kyc_status = safe.kyc_verified ? 'verified' : 'pending';
    }
    return safe;
  }
};

module.exports = User;
