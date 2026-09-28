const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Review = require('../models/Review');
const RentalAgreement = require('../models/RentalAgreement');
const { authenticate, authorize } = require('../middleware/auth');
const db = require('../config/db');

// All review routes require authentication
router.use(authenticate);

// -----------------------------------------------------------------------
// POST /api/reviews
// Submit a review. Both parties must be KYC-verified and share an active
// rental agreement. One review per (reviewer, reviewee, agreement) triple.
// -----------------------------------------------------------------------
router.post('/', authorize('tenant', 'landlord'), async (req, res) => {
  try {
    const { revieweeId, rentalAgreementId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    if (!revieweeId || !rentalAgreementId || !rating) {
      return res.status(400).json({ error: 'revieweeId, rentalAgreementId, and rating are required.' });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }

    if (reviewerId === revieweeId) {
      return res.status(400).json({ error: 'You cannot review yourself.' });
    }

    // Reviewer must be KYC-verified
    const reviewer = await User.findById(reviewerId);
    if (!reviewer.kyc_verified) {
      return res.status(403).json({ error: 'Your KYC must be verified before you can leave a review.' });
    }

    // Reviewee must exist and be KYC-verified
    const reviewee = await User.findById(revieweeId);
    if (!reviewee) {
      return res.status(404).json({ error: 'The user you are trying to review does not exist.' });
    }
    if (!reviewee.kyc_verified) {
      return res.status(403).json({ error: 'The user you are reviewing has not yet completed KYC verification.' });
    }

    // Validate the rental agreement exists and involves both parties
    const agreement = await RentalAgreement.findById(rentalAgreementId);
    if (!agreement) {
      return res.status(404).json({ error: 'Rental agreement not found.' });
    }
    if (agreement.status !== 'active') {
      return res.status(403).json({ error: 'Reviews can only be submitted for active rental agreements.' });
    }

    const partiesMatch =
      (agreement.tenant_id === reviewerId && agreement.landlord_id === revieweeId) ||
      (agreement.landlord_id === reviewerId && agreement.tenant_id === revieweeId);

    if (!partiesMatch) {
      return res.status(403).json({ error: 'You are not a party to this rental agreement.' });
    }

    // Prevent duplicate reviews for the same agreement
    const exists = await Review.existsForAgreement(reviewerId, revieweeId, rentalAgreementId);
    if (exists) {
      return res.status(409).json({ error: 'You have already submitted a review for this rental agreement.' });
    }

    const review = await Review.create({ reviewerId, revieweeId, rentalAgreementId, rating: ratingNum, comment });
    return res.status(201).json({ review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit review.', details: err.message });
  }
});

// -----------------------------------------------------------------------
// GET /api/reviews/user/:userId
// Public profile: get all reviews + aggregate rating for a user.
// -----------------------------------------------------------------------
router.get('/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const reviews = await Review.findByReviewee(req.params.userId);
    const { total, average } = await Review.averageRating(req.params.userId);

    res.json({
      user: User.toSafeObject(user),
      averageRating: average,
      totalReviews: total,
      reviews
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reviews.', details: err.message });
  }
});

// -----------------------------------------------------------------------
// GET /api/reviews/my-agreements
// Returns active agreements the current user is a party to, so the frontend
// knows which agreements are eligible for review.
// -----------------------------------------------------------------------
router.get('/my-agreements', authorize('tenant', 'landlord'), async (req, res) => {
  try {
    const userId = req.user.id;
    const resDb = await db.query(`
      SELECT ra.*,
        t.name  AS tenant_name,  t.email  AS tenant_email,  t.kyc_verified AS tenant_kyc,
        ll.name AS landlord_name, ll.email AS landlord_email, ll.kyc_verified AS landlord_kyc
      FROM rental_agreements ra
      LEFT JOIN users t  ON t.id  = ra.tenant_id
      LEFT JOIN users ll ON ll.id = ra.landlord_id
      WHERE ra.status = 'active'
        AND (ra.tenant_id = $1 OR ra.landlord_id = $2)
      ORDER BY ra.created_at DESC
    `, [userId, userId]);

    res.json({ agreements: resDb.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch agreements.', details: err.message });
  }
});

module.exports = router;
