const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const User = {
  create({ name, email, password, role, contact, address, kycDocumentPath }) {
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, contact, address, kyc_document_path)
      VALUES (@id, @name, @email, @password_hash, @role, @contact, @address, @kyc_document_path)
    `);
    stmt.run({
      id,
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role,
      contact: contact || null,
      address: address || null,
      kyc_document_path: kycDocumentPath || null
    });
    return User.findById(id);
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  },

  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  findAll() {
    return db.prepare('SELECT id, name, email, role, contact, address, kyc_verified, created_at FROM users ORDER BY created_at DESC').all();
  },

  findByRole(role) {
    return db.prepare('SELECT id, name, email, role FROM users WHERE role = ?').all(role);
  },

  verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
  },

  setKycVerified(id, verified) {
    db.prepare('UPDATE users SET kyc_verified = ? WHERE id = ?').run(verified ? 1 : 0, id);
    return User.findById(id);
  },

  updateRole(id, role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    return User.findById(id);
  },

  toSafeObject(user) {
    if (!user) return null;
    const { password_hash, ...safe } = user;
    return safe;
  }
};

module.exports = User;
