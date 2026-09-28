const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const Mediation = {
  createSession({ disputeId, mediatorId, sessionDate, sessionNotes, proposedResolution }) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO mediation_sessions (id, dispute_id, mediator_id, session_date, session_notes, proposed_resolution)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, disputeId, mediatorId, sessionDate || null, sessionNotes || null, proposedResolution || null);
    return Mediation.findById(id);
  },

  findById(id) {
    return db.prepare('SELECT * FROM mediation_sessions WHERE id = ?').get(id);
  },

  findByDispute(disputeId) {
    return db.prepare(`
      SELECT ms.*, u.name as mediator_name
      FROM mediation_sessions ms
      LEFT JOIN users u ON u.id = ms.mediator_id
      WHERE ms.dispute_id = ?
      ORDER BY ms.created_at DESC
    `).all(disputeId);
  },

  updateNotes(id, { sessionDate, sessionNotes, proposedResolution }) {
    db.prepare(`
      UPDATE mediation_sessions
      SET session_date = COALESCE(?, session_date),
          session_notes = COALESCE(?, session_notes),
          proposed_resolution = COALESCE(?, proposed_resolution),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(sessionDate || null, sessionNotes || null, proposedResolution || null, id);
    return Mediation.findById(id);
  },

  recordDecision(id, party, decision) {
    // party is 'tenant' or 'landlord'
    const column = party === 'tenant' ? 'tenant_decision' : 'landlord_decision';
    db.prepare(`UPDATE mediation_sessions SET ${column} = ?, updated_at = datetime('now') WHERE id = ?`).run(decision, id);
    const session = Mediation.findById(id);

    let finalDecision = null;
    if (session.tenant_decision === 'Accepted' && session.landlord_decision === 'Accepted') {
      finalDecision = 'Resolved';
    } else if (session.tenant_decision === 'Rejected' || session.landlord_decision === 'Rejected') {
      finalDecision = 'Escalated';
    }

    if (finalDecision) {
      db.prepare(`UPDATE mediation_sessions SET final_decision = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(finalDecision, id);
    }

    return Mediation.findById(id);
  }
};

module.exports = Mediation;
