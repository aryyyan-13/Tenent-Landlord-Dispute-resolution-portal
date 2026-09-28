import React, { useState } from 'react';
import client from '../api/client.js';

export default function ReviewForm({ targetUserId, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/reviews', {
        target_user_id: targetUserId,
        rating,
        comment
      });
      onReviewSubmitted(data.review || data);
      setRating(0);
      setComment('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 'var(--space-lg)' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 'var(--text-headline-md-size)', fontFamily: 'var(--font-serif)', color: 'var(--color-primary)' }}>
        Write an Official Review
      </h3>
      
      {error && (
        <div style={{ padding: 12, background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', borderRadius: 8, marginBottom: 16, fontSize: 'var(--text-body-sm-size)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-label-sm-size)', fontWeight: 600, marginBottom: 8 }}>Rating *</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  color: (hoverRating || rating) >= star ? 'var(--color-secondary)' : 'var(--color-outline-variant)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 32, fontVariationSettings: (hoverRating || rating) >= star ? "'FILL' 1" : "'FILL' 0" }}>star</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-label-sm-size)', fontWeight: 600, marginBottom: 8 }}>Review Comments</label>
          <textarea
            className="input"
            style={{ height: 100 }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience (optional)..."
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}
