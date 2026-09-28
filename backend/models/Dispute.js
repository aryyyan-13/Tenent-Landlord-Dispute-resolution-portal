const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

async function generateCaseNumber() {
  const year = new Date().getFullYear();
  const res = await db.query(`SELECT COUNT(*) as count FROM disputes WHERE case_number LIKE $1`, [`TLDRP-${year}-%`]);
  const count = parseInt(res.rows[0].count, 10);
  const seq = String(count + 1).padStart(4, '0');
  return `TLDRP-${year}-${seq}`;
}

const Dispute = {
  async create({ filedById, opposingPartyId, category, description, desiredOutcome, propertyAddress }) {
    const id = uuidv4();
    const caseNumber = await generateCaseNumber();
    await db.query(`
      INSERT INTO disputes (id, case_number, filed_by_id, opposing_party_id, category, description, desired_outcome, property_address, case_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open_negotiation')
    `, [id, caseNumber, filedById, opposingPartyId, category, description, desiredOutcome, propertyAddress]);

    await Dispute.addTimelineEntry(id, 'open_negotiation', 'Dispute filed and submitted for review.', filedById);
    return Dispute.findById(id);
  },

  async findById(id) {
    const res = await db.query('SELECT * FROM disputes WHERE id = $1', [id]);
    return res.rows[0];
  },

  async findByCaseNumber(caseNumber) {
    const res = await db.query('SELECT * FROM disputes WHERE case_number = $1', [caseNumber]);
    return res.rows[0];
  },

  async findAll() {
    const res = await db.query('SELECT * FROM disputes ORDER BY created_at DESC');
    return res.rows;
  },

  async findForUser(userId) {
    const res = await db.query(`
      SELECT * FROM disputes
      WHERE filed_by_id = $1 OR opposing_party_id = $2 OR mediator_id = $3
      ORDER BY created_at DESC
    `, [userId, userId, userId]);
    return res.rows;
  },

  async assignMediator(disputeId, mediatorId, actorId) {
    await db.query(`UPDATE disputes SET mediator_id = $1, case_status = 'open_mediation', updated_at = now() WHERE id = $2`, [mediatorId, disputeId]);
    await Dispute.addTimelineEntry(disputeId, 'open_mediation', 'Mediator assigned to the case.', actorId);
    return Dispute.findById(disputeId);
  },

  async updateStatus(disputeId, status, note, actorId) {
    await db.query(`UPDATE disputes SET case_status = $1, updated_at = now() WHERE id = $2`, [status, disputeId]);
    await Dispute.addTimelineEntry(disputeId, status, note, actorId);
    return Dispute.findById(disputeId);
  },

  async addTimelineEntry(disputeId, status, note, actorId) {
    const id = uuidv4();
    await db.query(`
      INSERT INTO case_status_history (id, dispute_id, to_status, reason, changed_by_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, disputeId, status, note || null, actorId || null]);
  },

  async getTimeline(disputeId) {
    const res = await db.query(`
      SELECT t.*, u.name as actor_name, u.role as actor_role
      FROM case_status_history t
      LEFT JOIN users u ON u.id = t.changed_by_id
      WHERE t.dispute_id = $1
      ORDER BY t.created_at ASC
    `, [disputeId]);
    return res.rows;
  },

  async addDocument(disputeId, uploadedById, fileName, filePath, label) {
    const id = uuidv4();
    await db.query(`
      INSERT INTO dispute_documents (id, dispute_id, uploaded_by_id, file_name, file_path, doc_type)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, disputeId, uploadedById, fileName, filePath, label || 'evidence']);
    
    const res = await db.query('SELECT * FROM dispute_documents WHERE id = $1', [id]);
    return res.rows[0];
  },

  async getDocuments(disputeId) {
    const res = await db.query(`
      SELECT d.*, u.name as uploaded_by_name
      FROM dispute_documents d
      LEFT JOIN users u ON u.id = d.uploaded_by_id
      WHERE d.dispute_id = $1
      ORDER BY d.created_at ASC
    `, [disputeId]);
    return res.rows;
  },

  async addMessage(disputeId, senderId, body) {
    const id = uuidv4();
    await db.query(`INSERT INTO messages (id, dispute_id, sender_id, body) VALUES ($1, $2, $3, $4)`, [id, disputeId, senderId, body]);
    const res = await db.query('SELECT * FROM messages WHERE id = $1', [id]);
    return res.rows[0];
  },

  async getMessages(disputeId) {
    const res = await db.query(`
      SELECT m.*, u.name as sender_name, u.role as sender_role
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.dispute_id = $1
      ORDER BY m.created_at ASC
    `, [disputeId]);
    return res.rows;
  },

  isParticipant(dispute, userId) {
    return dispute.filed_by_id === userId || dispute.opposing_party_id === userId || dispute.mediator_id === userId;
  },

  async analytics() {
    const totalRes = await db.query('SELECT COUNT(*) as c FROM disputes');
    const total = parseInt(totalRes.rows[0].c, 10);
    
    const resolvedRes = await db.query(`SELECT COUNT(*) as c FROM disputes WHERE case_status = 'resolved_settlement_mediation' OR case_status = 'resolved_settlement_negotiation'`);
    const resolved = parseInt(resolvedRes.rows[0].c, 10);
    
    const escalatedRes = await db.query(`SELECT COUNT(*) as c FROM disputes WHERE case_status = 'mediation_failed' OR case_status = 'closed_referred_rent_authority'`);
    const escalated = parseInt(escalatedRes.rows[0].c, 10);

    // Distinct admin metric: cases in mediation_failed but NOT yet referred to Rent Authority
    const awaitingRefRes = await db.query(`SELECT COUNT(*) as c FROM disputes WHERE case_status = 'mediation_failed'`);
    const escalatedAwaitingReference = parseInt(awaitingRefRes.rows[0].c, 10);
    
    const byStatusRes = await db.query('SELECT case_status as status, COUNT(*) as count FROM disputes GROUP BY case_status');
    const byStatus = byStatusRes.rows;
    
    const byCategoryRes = await db.query('SELECT category, COUNT(*) as count FROM disputes GROUP BY category');
    const byCategory = byCategoryRes.rows;
    
    const avgRes = await db.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_days
      FROM disputes WHERE case_status IN ('resolved_settlement_mediation', 'resolved_settlement_negotiation', 'closed_withdrawn', 'closed_referred_rent_authority')
    `);
    const avgResolutionDays = avgRes.rows[0].avg_days ? parseFloat(avgRes.rows[0].avg_days) : null;

    return {
      totalCases: total,
      resolvedCases: resolved,
      escalatedCases: escalated,
      escalatedAwaitingReference,
      resolutionRate: total > 0 ? Number(((resolved / total) * 100).toFixed(1)) : 0,
      escalationRate: total > 0 ? Number(((escalated / total) * 100).toFixed(1)) : 0,
      averageResolutionDays: avgResolutionDays ? Number(avgResolutionDays.toFixed(1)) : null,
      byStatus,
      byCategory
    };
  }
};

module.exports = Dispute;
