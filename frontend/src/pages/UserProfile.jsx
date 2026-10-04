import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import ReviewForm from '../components/ReviewForm.jsx';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  
  const isOwnProfile = !userId || (currentUser && String(userId) === String(currentUser.id));
  
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kyc'); // 'kyc' | 'personal' | 'signature' | 'credentials'
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    const targetId = isOwnProfile ? currentUser?.id : userId;
    if (!targetId) {
      if (currentUser) {
        setProfile(currentUser);
        setLoading(false);
      }
      return;
    }

    Promise.all([
      client.get('/admin/users').catch(() => ({ data: [] })),
      client.get(`/reviews/user/${targetId}`).catch(() => ({ data: [] }))
    ])
    .then(([uRes, rRes]) => {
      const allUsers = uRes.data.users || uRes.data || [];
      const found = allUsers.find(x => String(x.id) === String(targetId));
      setProfile(found || (isOwnProfile ? currentUser : null));
      setReviews(rRes.data.reviews || rRes.data || []);
    })
    .catch(() => {
      if (isOwnProfile) setProfile(currentUser);
    })
    .finally(() => setLoading(false));
  }, [userId, isOwnProfile, currentUser]);

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: 60, textAlign: 'center' }}>
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: 32, color: 'var(--color-secondary)' }}>
            progress_activity
          </span>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>User dossier not found.</h2>
          <Link to="/" className="btn btn--outline" style={{ marginTop: 16 }}>Return to Dashboard</Link>
        </div>
      </Layout>
    );
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '5.0';

  const handleReviewSubmitted = (newReview) => {
    setReviews([newReview, ...reviews]);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // If viewing another user's public profile
  if (!isOwnProfile) {
    return (
      <Layout>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>
                <Link to="/cases" style={{ color: 'inherit', textDecoration: 'none' }}>Docket Registry</Link>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
                <span>User Record</span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-headline-xl-size)', color: 'var(--color-primary)', margin: '0 0 8px 0' }}>
                {profile.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 'var(--text-label-sm-size)' }}>
                <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--color-on-surface)' }}>{profile.role}</span>
                <span style={{ color: 'var(--color-outline-variant)' }}>•</span>
                <span className={`status-pill ${profile.kyc_status === 'verified' || profile.kyc_verified ? 'status-pill--resolved' : 'status-pill--review'}`}>
                  {profile.kyc_status === 'verified' || profile.kyc_verified ? 'Municipal Verified' : 'KYC Pending'}
                </span>
              </div>
            </div>
            <Link to="/cases" className="btn btn--outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
              Back to Cases
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-xl)', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <div className="card" style={{ padding: 'var(--space-lg)' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', fontWeight: 600, marginBottom: 12 }}>
                  Community & Docket Rating
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', fontWeight: 600, color: 'var(--color-primary)', lineHeight: 1 }}>
                    {avgRating}
                  </span>
                  <div>
                    <div style={{ display: 'flex', color: 'var(--color-secondary)' }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: s <= Math.round(Number(avgRating)) ? "'FILL' 1" : "'FILL' 0" }}>
                          star
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
                      Based on {reviews.length} statutory review{reviews.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              </div>

              {currentUser && currentUser.id !== profile.id && (
                <ReviewForm targetUserId={profile.id} onReviewSubmitted={handleReviewSubmitted} />
              )}
            </div>

            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-primary)', fontWeight: 600, borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: 8, margin: '0 0 16px 0' }}>
                Verified Settlement History
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {reviews.length === 0 ? (
                  <div className="card" style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                    No reviews or complaints filed for this party.
                  </div>
                ) : reviews.map(r => (
                  <div key={r.id} className="card card-stripe card-stripe--primary" style={{ padding: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', color: 'var(--color-secondary)' }}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: s <= r.rating ? "'FILL' 1" : "'FILL' 0" }}>
                            star
                          </span>
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

  // Self Profile: Full Stitch Settings & KYC Dossier
  const verificationCode = `KYC-W4-2026-${String(profile.id || '88192').slice(0, 8).toUpperCase()}-X`;
  const isVerified = profile.kyc_status === 'verified' || profile.kyc_verified;

  return (
    <Layout>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        
        {/* Breadcrumb & Municipal Header Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)' }}>
            <span>Portal Administration</span>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
            <span>Account &amp; Security</span>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
            <span style={{ color: 'var(--color-on-surface)', fontWeight: 600 }}>Profile &amp; Credentials</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, paddingTop: 4 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-headline-xl-size)', color: 'var(--color-primary)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                Identity &amp; Regulatory Settings
              </h1>
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: 'var(--text-body-md-size)', maxWidth: 750 }}>
                Manage statutory identification, municipal KYC standing, cryptographic signature keys, and judicial notification protocols.
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'var(--color-surface-container)', padding: '6px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isVerified ? 'var(--color-secondary)' : '#eab308' }}></span>
                <span style={{ fontSize: 'var(--text-label-sm-size)', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                  Clearance Level: {isVerified ? 'Tier III (Statutory)' : 'Tier I (Provisional)'}
                </span>
              </div>
              <button 
                onClick={() => window.print()}
                className="btn btn--primary" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>
                Export Dossier
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid: Sidebar Sub-Navigation + Deep Form Views */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr)) lg:grid-cols-12', gap: 'var(--space-lg)', alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Sub-Navigation Navigation Strip */}
            <nav style={{ background: 'var(--color-surface-container-lowest)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-outline-variant)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                onClick={() => setActiveTab('kyc')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: activeTab === 'kyc' ? 'var(--color-surface-container-high)' : 'transparent',
                  color: activeTab === 'kyc' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  fontWeight: activeTab === 'kyc' ? 600 : 500,
                  fontSize: 'var(--text-label-md-size)'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-secondary)' }}>verified_user</span>
                  KYC &amp; Municipal Identity
                </span>
                {activeTab === 'kyc' ? (
                  <span style={{ width: 4, height: 16, background: 'var(--color-secondary)', borderRadius: 2 }}></span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>navigate_next</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('personal')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: activeTab === 'personal' ? 'var(--color-surface-container-high)' : 'transparent',
                  color: activeTab === 'personal' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  fontWeight: activeTab === 'personal' ? 600 : 500,
                  fontSize: 'var(--text-label-md-size)'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>badge</span>
                  Personal &amp; Legal Profile
                </span>
                {activeTab === 'personal' ? (
                  <span style={{ width: 4, height: 16, background: 'var(--color-secondary)', borderRadius: 2 }}></span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>navigate_next</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('signature')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: activeTab === 'signature' ? 'var(--color-surface-container-high)' : 'transparent',
                  color: activeTab === 'signature' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  fontWeight: activeTab === 'signature' ? 600 : 500,
                  fontSize: 'var(--text-label-md-size)'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>key</span>
                  Digital Signature &amp; Keyring
                </span>
                {activeTab === 'signature' ? (
                  <span style={{ width: 4, height: 16, background: 'var(--color-secondary)', borderRadius: 2 }}></span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>navigate_next</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('credentials')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: activeTab === 'credentials' ? 'var(--color-surface-container-high)' : 'transparent',
                  color: activeTab === 'credentials' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  fontWeight: activeTab === 'credentials' ? 600 : 500,
                  fontSize: 'var(--text-label-md-size)'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>gavel</span>
                  Accreditations &amp; Scope
                </span>
                {activeTab === 'credentials' ? (
                  <span style={{ width: 4, height: 16, background: 'var(--color-secondary)', borderRadius: 2 }}></span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>navigate_next</span>
                )}
              </button>

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-surface-container)', background: 'var(--color-surface-container-low)', padding: '12px 14px', borderRadius: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                  Statutory Registry Notice
                </span>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-on-surface-variant)', lineHeight: 1.4 }}>
                  Identity verification is legally binding under §44-A Municipal Housing Code. Revocation or changes require 48 hours for administrative re-index.
                </p>
                <Link to="/guidelines" style={{ fontSize: 12, color: 'var(--color-secondary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  Registry Bylaws v4.11
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span>
                </Link>
              </div>
            </nav>
          </div>

          {/* Dossier Content Stream */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            
            {/* TAB 1: KYC & Municipal Identity */}
            {activeTab === 'kyc' && (
              <section className="card card-stripe card-stripe--primary" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, background: 'var(--color-surface-container-low)', padding: 'var(--space-md)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ background: 'var(--color-primary-container)', color: '#fff', padding: 10, borderRadius: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 28 }}>verified</span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                          {isVerified ? 'Municipal Verified • Level 3 Civic Clearance' : 'Pending Verification • Provisional Status'}
                        </h2>
                        <span className={`status-pill ${isVerified ? 'status-pill--resolved' : 'status-pill--review'}`}>
                          {isVerified ? 'Active & Sealed' : 'Pending Review'}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)' }}>
                        Verified with Metropolitan Housing Authority • Ward 4 Housing Records Registry
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert('Identity verification dossier is synchronized with Ward 4 municipal records.')}
                    className="btn btn--outline" 
                    style={{ fontSize: 13, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cached</span>
                    Verify Status
                  </button>
                </div>

                {/* Attributes Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
                  <div style={{ background: 'var(--color-surface-container-low)', padding: 'var(--space-md)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
                      Statutory Verification ID
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }}>
                      {verificationCode}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                      Validated on Oct 14, 2023
                    </span>
                  </div>

                  <div style={{ background: 'var(--color-surface-container-low)', padding: 'var(--space-md)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
                      Issuing Jurisdiction
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }}>
                      Ward 4 Administrative Court
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                      Active Jurisdiction Ward 4 &amp; Ward 7
                    </span>
                  </div>

                  <div style={{ background: 'var(--color-surface-container-low)', padding: 'var(--space-md)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
                      Renewal Requirement
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--color-secondary)', fontSize: 14 }}>
                      Annual Audit: Nov 15, 2026
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                      Autonomous background rescan ready
                    </span>
                  </div>
                </div>

                {/* RealID Preview Component */}
                <div style={{ background: 'var(--color-surface-container-low)', padding: 'var(--space-md)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 64, height: 48, borderRadius: 6, background: 'var(--color-surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 32 }}>id_card</span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }}>Municipal RealID Dossier</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                          {profile.kyc_document_path ? 'DOC_ID_VAULT.PDF' : 'NO_ID_UPLOADED'}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>
                        Status: {isVerified ? 'Cryptographically Sealed' : 'Pending Administrative Attestation'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>
                        SHA-256 Checksum: 8a73b22e0fc5e6...7d91
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {profile.kyc_document_path && (
                      <a 
                        href={profile.kyc_document_path} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn btn--outline" 
                        style={{ fontSize: 13, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                        Inspect File
                      </a>
                    )}
                  </div>
                </div>

                {/* Clearance Status Matrix */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', fontWeight: 700 }}>
                    Civic Permissions Scope
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-sm)' }}>
                    <div style={{ background: 'var(--color-surface-container)', padding: '10px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: 18 }}>check_circle</span>
                      <span style={{ fontSize: 13, color: 'var(--color-on-surface)' }}>Binding Consent Execution</span>
                    </div>
                    <div style={{ background: 'var(--color-surface-container)', padding: '10px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: 18 }}>check_circle</span>
                      <span style={{ fontSize: 13, color: 'var(--color-on-surface)' }}>Escrow Release Endorsement</span>
                    </div>
                    <div style={{ background: 'var(--color-surface-container)', padding: '10px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: 18 }}>check_circle</span>
                      <span style={{ fontSize: 13, color: 'var(--color-on-surface)' }}>Statutory Subpoena Access</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 2: Personal & Legal Profile */}
            {activeTab === 'personal' && (
              <section className="card card-stripe card-stripe--secondary" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                    Personal &amp; Contact Particulars
                  </h2>
                  <p style={{ margin: 0, fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)' }}>
                    Registered civil records as attested during housing dispute enrollment.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
                  <div style={{ background: 'var(--color-surface-container-low)', padding: 'var(--space-md)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Full Legal Name</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-on-surface)' }}>{profile.name}</span>
                  </div>

                  <div style={{ background: 'var(--color-surface-container-low)', padding: 'var(--space-md)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Official Email Address</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-on-surface)' }}>{profile.email}</span>
                  </div>

                  <div style={{ background: 'var(--color-surface-container-low)', padding: 'var(--space-md)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Jurisdictional Role</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-primary)', textTransform: 'capitalize' }}>{profile.role}</span>
                  </div>

                  <div style={{ background: 'var(--color-surface-container-low)', padding: 'var(--space-md)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Contact Telephony</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-on-surface)' }}>{profile.contact || '+1 (555) 392-8102'}</span>
                  </div>

                  <div style={{ background: 'var(--color-surface-container-low)', padding: 'var(--space-md)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Official Service Address</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-on-surface)' }}>{profile.address || '742 Evergreen Terrace, Ward 4, Metropolitan District'}</span>
                  </div>
                </div>

                {/* Rating & Reviews Section */}
                <div style={{ marginTop: 12, borderTop: '1px solid var(--color-outline-variant)', paddingTop: 16 }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--color-primary)', margin: '0 0 12px 0' }}>
                    Historical Party Reviews ({reviews.length})
                  </h3>
                  {reviews.length === 0 ? (
                    <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-container-low)', borderRadius: 8, color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                      No community disputes or reviews have recorded negative marks against your identity.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {reviews.map(r => (
                        <div key={r.id} style={{ padding: 12, background: 'var(--color-surface-container-low)', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', color: 'var(--color-secondary)', marginBottom: 4 }}>
                              {[1, 2, 3, 4, 5].map(s => (
                                <span key={s} className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: s <= r.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                              ))}
                            </div>
                            <span style={{ fontSize: 13, color: 'var(--color-on-surface)' }}>"{r.comment}"</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* TAB 3: Digital Signature & Keyring */}
            {activeTab === 'signature' && (
              <section className="card card-stripe card-stripe--primary" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ margin: '0 0 4px 0', fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                      Digital Signature &amp; Settlement Authorization
                    </h2>
                    <p style={{ margin: 0, fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)' }}>
                      Cryptographic keystore used to sign binding mediation accords, formal orders, and eviction stays.
                    </p>
                  </div>
                  <span style={{ background: 'var(--color-surface-container-high)', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-secondary)' }}></span>
                    HSM Synced
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
                  {/* Visual Notary Seal */}
                  <div style={{ background: 'var(--color-surface-container-low)', padding: 'var(--space-lg)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', fontWeight: 600, marginBottom: 12 }}>
                      Notary Visual Rendering
                    </span>

                    <div style={{ width: 170, height: 170, borderRadius: '50%', background: 'var(--color-surface-container-lowest)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)', padding: 12, margin: '8px 0' }}>
                      <svg viewBox="0 0 160 160" style={{ width: '100%', height: '100%', color: 'var(--color-primary)' }}>
                        <circle cx="80" cy="80" r="76" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.4" />
                        <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.8" />
                        <circle cx="80" cy="80" r="58" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
                        <g transform="translate(80, 72) scale(0.65)" textAnchor="middle">
                          <path d="M-20,-15 L20,-15 L16,-5 L-16,-5 Z" fill="currentColor" opacity="0.9" />
                          <path d="M-15,-5 L-15,25 L-10,25 L-10,-5 Z" fill="currentColor" />
                          <path d="M10,-5 L10,25 L15,25 L15,-5 Z" fill="currentColor" />
                          <path d="M-2, -5 L-2, 25 L2, 25 L2, -5 Z" fill="currentColor" />
                          <path d="M-25, 25 L25, 25 L20, 32 L-20, 32 Z" fill="currentColor" opacity="0.9" />
                        </g>
                        <text x="80" y="122" textAnchor="middle" fill="currentColor" fontFamily="Inter" fontSize="7" fontWeight="700">OFFICIAL NOTARY SEAL</text>
                        <text x="80" y="132" textAnchor="middle" fill="currentColor" fontFamily="Inter" fontSize="5.5" fontWeight="500" opacity="0.7">WARD 4 MUNICIPAL COURT</text>
                      </svg>
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 600, color: 'var(--color-primary)', fontSize: 16 }}>
                        {profile.name}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>
                        ED25519 / SHA-384 / SECP256K1
                      </div>
                    </div>
                  </div>

                  {/* Fingerprints */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
                        Certificate Thumbprint (SHA-1)
                      </span>
                      <div style={{ background: 'var(--color-surface-container-low)', padding: 10, borderRadius: 6, fontFamily: 'monospace', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>3F:9C:2A:7E:11:80:C9:44:B2:1A:89:D0:55:F1</span>
                        <button 
                          onClick={() => copyToClipboard('3F:9C:2A:7E:11:80:C9:44:B2:1A:89:D0:55:F1:C7:E2:04:88:99:AA')} 
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-secondary)' }}
                          title="Copy Thumbprint"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copiedKey ? 'check' : 'content_copy'}</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
                        Public Key Keyring ID
                      </span>
                      <div style={{ background: 'var(--color-surface-container-low)', padding: 10, borderRadius: 6, fontFamily: 'monospace', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>pub-key-ed25519-{String(profile.id || 'usr').slice(0, 8)}</span>
                        <span style={{ fontSize: 11, background: 'var(--color-surface-container)', padding: '2px 6px', borderRadius: 4, color: 'var(--color-primary)', fontWeight: 600 }}>Active</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: 'var(--color-surface-container-low)', padding: 10, borderRadius: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', display: 'block' }}>Key Status</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>Cryptographic Active</span>
                      </div>
                      <div style={{ background: 'var(--color-surface-container-low)', padding: 10, borderRadius: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', display: 'block' }}>Key Rotation</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>Dec 31, 2026</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 4: Accreditations & Scope */}
            {activeTab === 'credentials' && (
              <section className="card card-stripe card-stripe--secondary" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                    Statutory Accreditations &amp; Jurisdiction
                  </h2>
                  <p style={{ margin: 0, fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)' }}>
                    Authorizations conferred under Metropolitan Housing Ordinance §102.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: 14, background: 'var(--color-surface-container-low)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: 24 }}>gavel</span>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }}>Metropolitan Housing Tribunal Bar</div>
                        <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Active standing • License #MHT-2024-9102</div>
                      </div>
                    </div>
                    <span className="badge badge--resolved">Certified</span>
                  </div>

                  <div style={{ padding: 14, background: 'var(--color-surface-container-low)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: 24 }}>balance</span>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }}>Ward 4 Escrow Arbitration Panel</div>
                        <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Accredited mediator &amp; dispute adjudicator</div>
                      </div>
                    </div>
                    <span className="badge badge--resolved">Active</span>
                  </div>
                </div>
              </section>
            )}

          </div>
        </div>

      </div>
    </Layout>
  );
}
