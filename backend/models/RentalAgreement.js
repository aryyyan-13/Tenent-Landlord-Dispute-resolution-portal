const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const RentalAgreement = {
  async create({ tenantId, landlordId, propertyAddress, startDate, endDate, createdById }) {
    const id = uuidv4();
    await db.query(`
      INSERT INTO rental_agreements (id, tenant_id, landlord_id, property_address, start_date, end_date, created_by_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, tenantId, landlordId, propertyAddress, startDate, endDate || null, createdById]);
    return RentalAgreement.findById(id);
  },

  async findById(id) {
    const res = await db.query('SELECT * FROM rental_agreements WHERE id = $1', [id]);
    return res.rows[0];
  },

  async findAll() {
    const res = await db.query(`
      SELECT ra.*,
        t.name  AS tenant_name,  t.email  AS tenant_email,
        ll.name AS landlord_name, ll.email AS landlord_email
      FROM rental_agreements ra
      LEFT JOIN users t  ON t.id  = ra.tenant_id
      LEFT JOIN users ll ON ll.id = ra.landlord_id
      ORDER BY ra.created_at DESC
    `);
    return res.rows;
  },

  /**
   * Returns an active agreement between the two users (in either direction).
   */
  async findActive(userId1, userId2) {
    const res = await db.query(`
      SELECT * FROM rental_agreements
      WHERE status = 'active'
        AND (
          (tenant_id = $1 AND landlord_id = $2)
          OR
          (tenant_id = $3 AND landlord_id = $4)
        )
      LIMIT 1
    `, [userId1, userId2, userId2, userId1]);
    return res.rows[0];
  },

  async updateStatus(id, status) {
    await db.query(`UPDATE rental_agreements SET status = $1 WHERE id = $2`, [status, id]);
    return RentalAgreement.findById(id);
  }
};

module.exports = RentalAgreement;
