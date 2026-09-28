const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

function generateCaseNumber() {
  const year = new Date().getFullYear();
  const row = db.prepare(`SELECT COUNT(*) as count FROM disputes WHERE case_number LIKE ?`).get(`TLDRP-${year}-%`);
  const seq = String(row.count + 1).padStart(4, '0');
  return `TLDRP-${year}-${seq}`;
}

const Dispute = {
  create({ filedById, opposingPartyId, category, description }) {
    const id = uuidv4();
    const caseNumber = generateCaseNumber();
    db.prepare(`
      INSERT INTO disputes (id, case_number, filed_by_id, opposing_party_id, category, description, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Filed')
    `).run(id, caseNumber, filedById, opposingPartyId, category, description);

    Dispute.addTimelineEntry(id, 'Filed', 'Dispute filed and submitted for review.', filedById);
    return Dispute.findById(id);
  },

  findById(id) {
    return db.prepare('SELECT * FROM disputes WHERE id = ?').get(id);
  },

  findByCaseNumber(caseNumber) {
    return db.prepare('SELECT * FROM disputes WHERE case_number = ?').get(caseNumber);
  },

  findAll() {
    return db.prepare('SELECT * FROM disputes ORDER BY created_at DESC').all();
  },

  findForUser(userId) {
    return db.prepare(`
      SELECT * FROM disputes
      WHERE filed_by_id = ? OR opposing_party_id = ? OR mediator_id = ?
      ORDER BY created_at DESC
    `).all(userId, userId, userId);
  },

  assignMediator(disputeId, mediatorId, actorId) {
    db.prepare(`UPDATE disputes SET mediator_id = ?, status = 'Under Review', updated_at = datetime('now') WHERE id = ?`)
      .run(mediatorId, disputeId);
    Dispute.addTimelineEntry(disputeId, 'Under Review', 'Mediator assigned to the case.', actorId);
    return Dispute.findById(disputeId);
  },

  updateStatus(disputeId, status, note, actorId) {
    db.prepare(`UPDATE disputes SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, disputeId);
    Dispute.addTimelineEntry(disputeId, status, note, actorId);
    return Dispute.findById(disputeId);
  },

  addTimelineEntry(disputeId, status, note, actorId) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO case_timeline (id, dispute_id, status, note, actor_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, disputeId, status, note || null, actorId || null);
  },

  getTimeline(disputeId) {
    return db.prepare(`
      SELECT t.*, u.name as actor_name, u.role as actor_role
      FROM case_timeline t
      LEFT JOIN users u ON u.id = t.actor_id
      WHERE t.dispute_id = ?
      ORDER BY t.created_at ASC
    `).all(disputeId);
  },

  addDocument(disputeId, uploadedById, fileName, filePath, label) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO dispute_documents (id, dispute_id, uploaded_by_id, file_name, file_path, label)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, disputeId, uploadedById, fileName, filePath, label || null);
    return db.prepare('SELECT * FROM dispute_documents WHERE id = ?').get(id);
  },

  getDocuments(disputeId) {
    return db.prepare(`
      SELECT d.*, u.name as uploaded_by_name
      FROM dispute_documents d
      LEFT JOIN users u ON u.id = d.uploaded_by_id
      WHERE d.dispute_id = ?
      ORDER BY d.created_at ASC
    `).all(disputeId);
  },

  addMessage(disputeId, senderId, body) {
    const id = uuidv4();
    db.prepare(`INSERT INTO messages (id, dispute_id, sender_id, body) VALUES (?, ?, ?, ?)`)
      .run(id, disputeId, senderId, body);
    return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  },

  getMessages(disputeId) {
    return db.prepare(`
      SELECT m.*, u.name as sender_name, u.role as sender_role
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.dispute_id = ?
      ORDER BY m.created_at ASC
    `).all(disputeId);
  },

  isParticipant(dispute, userId) {
    return dispute.filed_by_id === userId || dispute.opposing_party_id === userId || dispute.mediator_id === userId;
  },

  analytics() {
    const total = db.prepare('SELECT COUNT(*) as c FROM disputes').get().c;
    const resolved = db.prepare(`SELECT COUNT(*) as c FROM disputes WHERE status = 'Resolved'`).get().c;
    const escalated = db.prepare(`SELECT COUNT(*) as c FROM disputes WHERE status = 'Escalated'`).get().c;
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM disputes GROUP BY status').all();
    const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM disputes GROUP BY category').all();
    const avgResolutionDays = db.prepare(`
      SELECT AVG(julianday(updated_at) - julianday(created_at)) as avg_days
      FROM disputes WHERE status IN ('Resolved','Closed')
    `).get().avg_days;

    return {
      totalCases: total,
      resolvedCases: resolved,
      escalatedCases: escalated,
      resolutionRate: total > 0 ? Number(((resolved / total) * 100).toFixed(1)) : 0,
      escalationRate: total > 0 ? Number(((escalated / total) * 100).toFixed(1)) : 0,
      averageResolutionDays: avgResolutionDays ? Number(avgResolutionDays.toFixed(1)) : null,
      byStatus,
      byCategory
    };
  }
};

module.exports = Dispute;
