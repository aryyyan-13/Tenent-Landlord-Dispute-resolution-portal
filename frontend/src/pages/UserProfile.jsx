import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import ReviewForm from '../components/ReviewForm.jsx';
import client from '../api/client.js';

export default function UserProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get(`/admin/users`), // just finding user from list for simplicity in this demo, real app would have GET /users/:id
      client.get(`/reviews/user/${userId}`)
    ])
    .then(([uRes, rRes]) => {
      const u = (uRes.data.users || uRes.data).find(x => x.id == userId);
      setProfile(u);
      setReviews(rRes.data.reviews || rRes.data);
    })
    .catch(() => {})
    .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Layout><div style={{ padding: 40, textAlign: 'center' }}><span className="material-symbols-outlined animate-spin" style={{ fontSize: 24, color: 'var(--color-outline)' }}>progress_activity</span></div></Layout>;
  if (!profile) return <Layout><div style={{ padding: 40 }}>User not found.</div></Layout>;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const handleReviewSubmitted = (newReview) => {
    setReviews([newReview, ...reviews]);
  };

  return (
    <Layout>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        
        {/* Header */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-headline-xl-size)', color: 'var(--color-primary)', margin: '0 0 8px 0' }}>{profile.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 'var(--text-label-sm-size)' }}>
            <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--color-on-surface)' }}>{profile.role}</span>
            <span style={{ color: 'var(--color-outline-variant)' }}>•</span>
            <span className={`badge ${profile.kyc_status === 'verified' ? 'badge--resolved' : 'badge--neutral'}`}>{profile.kyc_status === 'verified' ? 'KYC Verified' : 'KYC Pending'}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-xl)', alignItems: 'start' }}>
          {/* Main Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            
            <div className="card" style={{ padding: 'var(--space-lg)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', fontWeight: 600, marginBottom: 12 }}>Overall Rating</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', fontWeight: 600, color: 'var(--color-primary)', lineHeight: 1 }}>{avgRating}</span>
                <div>
                  <div style={{ display: 'flex', color: 'var(--color-secondary)' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: s <= Math.round(avgRating) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)', marginTop: 4 }}>Based on {reviews.length} reviews</div>
                </div>
              </div>
            </div>

            <ReviewForm targetUserId={profile.id} onReviewSubmitted={handleReviewSubmitted} />
          </div>

          {/* Reviews List */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-primary)', fontWeight: 600, borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: 8, margin: '0 0 16px 0' }}>
              Review History
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {reviews.length === 0 ? (
                <div className="card" style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>No reviews yet.</div>
              ) : reviews.map(r => (
                <div key={r.id} className="card card-stripe card-stripe--primary" style={{ padding: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', color: 'var(--color-secondary)' }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: s <= r.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {r.comment && <div style={{ fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface)', lineHeight: 1.5 }}>"{r.comment}"</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
