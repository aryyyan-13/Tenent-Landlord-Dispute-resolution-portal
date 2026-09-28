const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const Review = {
  async create({ reviewerId, revieweeId, rentalAgreementId, rating, comment }) {
    const id = uuidv4();
    await db.query(`
      INSERT INTO reviews (id, reviewer_id, reviewee_id, rental_agreement_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, reviewerId, revieweeId, rentalAgreementId, rating, comment || null]);
    return Review.findById(id);
  },

  async findById(id) {
    const res = await db.query('SELECT * FROM reviews WHERE id = $1', [id]);
    return res.rows[0];
  },

  /**
   * Returns all reviews written FOR a specific user (their public profile).
   */
  async findByReviewee(revieweeId) {
    const res = await db.query(`
      SELECT r.*,
        u.name AS reviewer_name, u.role AS reviewer_role
      FROM reviews r
      LEFT JOIN users u ON u.id = r.reviewer_id
      WHERE r.reviewee_id = $1
      ORDER BY r.created_at DESC
    `, [revieweeId]);
    return res.rows;
  },

  /**
   * Returns the average star rating and total review count for a user.
   */
  async averageRating(revieweeId) {
    const res = await db.query(`
      SELECT
        COUNT(*) AS total,
        ROUND(AVG(rating), 1) AS average
      FROM reviews
      WHERE reviewee_id = $1
    `, [revieweeId]);
    const row = res.rows[0];
    return { total: parseInt(row.total, 10), average: row.average ? parseFloat(row.average) : null };
  },

  /**
   * Checks if a reviewer has already reviewed this reviewee for a specific agreement.
   */
  async existsForAgreement(reviewerId, revieweeId, rentalAgreementId) {
    const res = await db.query(`
      SELECT id FROM reviews
      WHERE reviewer_id = $1 AND reviewee_id = $2 AND rental_agreement_id = $3
    `, [reviewerId, revieweeId, rentalAgreementId]);
    return res.rows.length > 0;
  }
};

module.exports = Review;
