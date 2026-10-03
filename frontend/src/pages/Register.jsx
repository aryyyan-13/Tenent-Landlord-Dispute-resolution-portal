import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'tenant',
  });
  const [kycDoc, setKycDoc] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!kycDoc) {
      setError('A valid KYC document (PDF/Image) is required by statute.');
      return;
    }
    setError('');

    const form = new FormData();
    form.append('name', formData.name);
    form.append('email', formData.email);
    form.append('password', formData.password);
    form.append('role', formData.role);
    form.append('kyc_document', kycDoc);

    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Registration failed');
    }
  };

  return (
    <div style={s.page}>
      <main style={s.main}>
        {/* Brand header */}
        <header style={s.header}>
          <div style={s.officialPill}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--color-secondary)' }}>verified_user</span>
            <span>Official Civic Mediation Service</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={s.logoMark}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>balance</span>
            </div>
            <span style={s.logoName}>TLDRP</span>
          </div>
        </header>

        {/* Auth card */}
        <div style={s.card}>
          <div style={s.cardAccent} />
          <div style={s.cardBody}>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h1 style={s.cardTitle}>Register dispute party</h1>
              <p style={s.cardSubtitle}>
                Create an official registry account to file or respond to civic mediation dockets.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Role selector */}
              <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend style={s.label}>Statutory Role *</legend>
                <div style={s.roleGrid}>
                  {[
                    { value: 'tenant', label: 'Tenant' },
                    { value: 'landlord', label: 'Landlord / Owner' }
                  ].map(role => {
                    const active = formData.role === role.value;
                    return (
                      <label
                        key={role.value}
                        style={{ ...s.roleBtn, ...(active ? s.roleBtnActive : {}) }}
                        onClick={() => setFormData({ ...formData, role: role.value })}
                      >
                        <input type="radio" name="role" value={role.value} checked={active} onChange={() => {}} style={{ display: 'none' }} />
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: active ? 'var(--color-secondary)' : 'transparent',
                          border: active ? 'none' : '1px solid var(--color-outline)',
                        }} />
                        <span style={{ fontSize: 'var(--text-label-sm-size)', fontWeight: active ? 600 : 400, color: active ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>
                          {role.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label style={s.label}>Full Legal Name *</label>
                <input required className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. John Doe or Acme Corp" />
              </div>

              <div>
                <label style={s.label}>Email Address *</label>
                <input required type="email" className="input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Used for official notices" />
              </div>

              <div>
                <label style={s.label}>Secure Password *</label>
                <input required type="password" className="input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>

              <div>
                <label style={s.label}>Gov-Issued ID / KYC Document *</label>
                <input required type="file" accept=".pdf,image/*" onChange={e => setKycDoc(e.target.files[0])} className="input" style={{ paddingTop: 8 }} />
                <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>Required by Municipal Code 14-B for verified party status.</div>
              </div>

              {/* Error */}
              {error && (
                <div style={s.errorBanner}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error_outline</span>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={s.submitBtn}
              >
                {loading ? (
                  <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span><span>Processing...</span></>
                ) : (
                  <><span>Register Account</span><span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span></>
                )}
              </button>
            </form>

            {/* Login link */}
            <div style={s.registerBand}>
              <p style={{ fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                Already registered?{' '}
                <a href="/login" style={s.registerLink}>
                  Sign in to case file
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md)' },
  main: { width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' },
  header: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', gap: 8, paddingBottom: 4 },
  officialPill: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius)', background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)', fontSize: 'var(--text-label-sm-size)', fontWeight: 500 },
  logoMark: { width: 32, height: 32, borderRadius: 'var(--radius)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoName: { fontFamily: 'var(--font-serif)', fontSize: '1.375rem', fontWeight: 600, color: 'var(--color-primary)', letterSpacing: '-0.01em' },
  
  card: { width: '100%', background: 'var(--color-surface-container-lowest)', borderRadius: 'var(--radius)', border: '1px solid var(--color-outline-variant)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  cardAccent: { height: 4, background: 'var(--color-secondary)', width: '100%' },
  cardBody: { padding: 'var(--space-xl)' },
  cardTitle: { fontFamily: 'var(--font-serif)', fontSize: '1.375rem', fontWeight: 600, color: 'var(--color-primary)', margin: '0 0 6px 0' },
  cardSubtitle: { fontSize: 'var(--text-label-md-size)', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.5 },
  label: { fontSize: 'var(--text-label-sm-size)', fontWeight: 600, color: 'var(--color-on-surface)', display: 'block', marginBottom: 6 },
  
  roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  roleBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius)', background: 'rgba(227,226,224,0.3)', cursor: 'pointer', transition: 'background 0.15s' },
  roleBtnActive: { background: 'var(--color-surface-container-low)' },
  
  errorBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', borderRadius: 'var(--radius)', fontSize: 'var(--text-body-sm-size)', border: '1px solid var(--color-error)' },
  submitBtn: { width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: 'var(--radius)', fontSize: 'var(--text-label-lg-size)', fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  
  registerBand: { marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', margin: 'var(--space-lg) calc(-1 * var(--space-xl)) 0', padding: 'var(--space-md) var(--space-xl) 0', background: 'rgba(244,243,241,0.5)', textAlign: 'center' },
  registerLink: { display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 'var(--text-label-sm-size)', fontWeight: 600, color: 'var(--color-secondary)', textDecoration: 'none' },
};
