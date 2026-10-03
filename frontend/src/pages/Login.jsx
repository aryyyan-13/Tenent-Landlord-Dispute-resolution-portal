import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = [
  { value: 'mediator', label: 'Neutral Mediator',  demo: 'mediator@tldrp.test' },
  { value: 'tenant',   label: 'Tenant',             demo: 'tenant@tldrp.test' },
  { value: 'landlord', label: 'Landlord / Owner',   demo: 'landlord@tldrp.test' },
  { value: 'admin',    label: 'Admin Officer',       demo: 'admin@tldrp.test' },
];

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('tenant');
  const [email, setEmail] = useState('tenant@tldrp.test');
  const [password, setPassword] = useState('Tenant@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRoleSelect = (role) => {
    setSelectedRole(role.value);
    setEmail(role.demo);
    const pw = { mediator: 'Mediator@123', tenant: 'Tenant@123', landlord: 'Landlord@123', admin: 'Admin@123' };
    setPassword(pw[role.value] || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      setSuccess(true);
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setSubmitting(false);
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
          <p style={s.logoSub}>Tenant-Landlord Dispute Resolution Portal</p>
        </header>

        {/* Auth card */}
        <div style={s.card}>
          <div style={s.cardAccent} />
          <div style={s.cardBody}>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h1 style={s.cardTitle}>Sign in to your case file</h1>
              <p style={s.cardSubtitle}>
                Access active mediation proceedings, evidence disclosures, and hearing schedules.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Role selector */}
              <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend style={s.label}>Select role access</legend>
                <div style={s.roleGrid}>
                  {ROLES.map(role => {
                    const active = selectedRole === role.value;
                    return (
                      <label
                        key={role.value}
                        style={{ ...s.roleBtn, ...(active ? s.roleBtnActive : {}) }}
                        onClick={() => handleRoleSelect(role)}
                      >
                        <input type="radio" name="user_role" value={role.value} checked={active} onChange={() => handleRoleSelect(role)} style={{ display: 'none' }} />
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: active ? 'var(--color-secondary)' : 'transparent',
                          border: active ? 'none' : '1px solid var(--color-outline)',
                        }} />
                        <span style={{ fontSize: 'var(--text-label-sm-size)', fontWeight: active ? 600 : 400, color: active ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {role.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label htmlFor="email" style={s.label}>Email address</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. name@domain.com"
                  required
                />
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="password" style={s.label}>Password</label>
                  <a href="#recovery" style={s.forgotLink}>Forgot password?</a>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    style={{ paddingRight: 40 }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={s.eyeBtn}
                    aria-label="Toggle password visibility"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Session checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                <input type="checkbox" defaultChecked id="keep-session" style={s.checkbox} />
                <label htmlFor="keep-session" style={{ fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}>
                  Keep session authorized (12h)
                </label>
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
                disabled={submitting || loading}
                style={{ ...s.submitBtn, ...(success ? s.submitBtnSuccess : {}) }}
              >
                {success ? (
                  <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span><span>Authenticated</span></>
                ) : submitting ? (
                  <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span><span>Verifying Case Authority…</span></>
                ) : (
                  <><span>Sign in to Case File</span><span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span></>
                )}
              </button>
            </form>

            {/* Register link */}
            <div style={s.registerBand}>
              <p style={{ fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                Don't have an account?{' '}
                <a href="/register" style={s.registerLink}>
                  Register new dispute party
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>north_east</span>
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Test credentials */}
        <div style={s.credsBox}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-secondary)', marginTop: 1, flexShrink: 0 }}>info</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Test Credentials</span>
                <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Click to fill</span>
              </div>
              {ROLES.map(role => (
                <button
                  key={role.value}
                  type="button"
                  style={s.credBtn}
                  onClick={() => handleRoleSelect(role)}
                >
                  <span style={{ fontSize: 12 }}>
                    <strong style={{ color: 'var(--color-on-surface)' }}>{role.label}:</strong>{' '}
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>{role.demo}</span>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-secondary)', fontWeight: 600 }}>Select</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={s.footer}>
          <p style={s.footerText}>Encrypted under Civil Dispute Mediation Protocol 14-B. Authorized use only.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(68,71,76,0.8)', fontSize: 11 }}>
            <a href="#terms" style={{ textDecoration: 'underline', color: 'inherit' }}>Procedural Rules</a>
            <span>•</span>
            <a href="#privacy" style={{ textDecoration: 'underline', color: 'inherit' }}>Statutory Privacy Act</a>
            <span>•</span>
            <a href="#help" style={{ textDecoration: 'underline', color: 'inherit' }}>Ombudsman Desk</a>
          </div>
        </footer>
      </main>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-md)',
  },
  main: {
    width: '100%',
    maxWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-md)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
    gap: 8,
    paddingBottom: 4,
  },
  officialPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px',
    borderRadius: 'var(--radius)',
    background: 'var(--color-surface-container-high)',
    color: 'var(--color-on-surface-variant)',
    fontSize: 'var(--text-label-sm-size)',
    fontWeight: 500,
  },
  logoMark: {
    width: 32, height: 32,
    borderRadius: 'var(--radius)',
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoName: {
    fontFamily: 'var(--font-serif)',
    fontSize: '1.375rem',
    fontWeight: 600,
    color: 'var(--color-primary)',
    letterSpacing: '-0.01em',
  },
  logoSub: {
    fontSize: 'var(--text-label-sm-size)',
    color: 'var(--color-on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    margin: 0,
    fontWeight: 500,
  },
  card: {
    width: '100%',
    background: 'var(--color-surface-container-lowest)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-outline-variant)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
  },
  cardAccent: {
    height: 4,
    background: 'var(--color-secondary)',
    width: '100%',
  },
  cardBody: {
    padding: 'var(--space-xl)',
  },
  cardTitle: {
    fontFamily: 'var(--font-serif)',
    fontSize: '1.375rem',
    fontWeight: 600,
    color: 'var(--color-primary)',
    margin: '0 0 6px 0',
  },
  cardSubtitle: {
    fontSize: 'var(--text-label-md-size)',
    color: 'var(--color-on-surface-variant)',
    margin: 0,
    lineHeight: 1.5,
  },
  label: {
    fontSize: 'var(--text-label-sm-size)',
    fontWeight: 600,
    color: 'var(--color-on-surface)',
    display: 'block',
    marginBottom: 6,
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  roleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 'var(--radius)',
    background: 'rgba(227,226,224,0.3)',
    cursor: 'pointer',
    transition: 'background 0.15s',
    overflow: 'hidden',
  },
  roleBtnActive: {
    background: 'var(--color-surface-container-low)',
  },
  forgotLink: {
    fontSize: 'var(--text-label-sm-size)',
    color: 'var(--color-secondary)',
    fontWeight: 500,
    textDecoration: 'none',
  },
  eyeBtn: {
    position: 'absolute',
    right: 8, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none',
    color: 'var(--color-outline)',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 4,
  },
  checkbox: {
    width: 16, height: 16,
    borderRadius: 'var(--radius)',
    accentColor: 'var(--color-primary)',
    cursor: 'pointer',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    background: 'var(--color-error-container)',
    color: 'var(--color-on-error-container)',
    borderRadius: 'var(--radius)',
    fontSize: 'var(--text-body-sm-size)',
    border: '1px solid var(--color-error)',
  },
  submitBtn: {
    width: '100%',
    height: 44,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: 'var(--text-label-lg-size)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
    marginTop: 4,
  },
  submitBtnSuccess: {
    background: 'var(--color-secondary)',
  },
  registerBand: {
    marginTop: 'var(--space-lg)',
    paddingTop: 'var(--space-md)',
    margin: 'var(--space-lg) calc(-1 * var(--space-xl)) 0',
    padding: 'var(--space-md) var(--space-xl) 0',
    background: 'rgba(244,243,241,0.5)',
    textAlign: 'center',
  },
  registerLink: {
    display: 'inline-flex', alignItems: 'center', gap: 2,
    fontSize: 'var(--text-label-sm-size)',
    fontWeight: 600,
    color: 'var(--color-secondary)',
    textDecoration: 'none',
  },
  credsBox: {
    width: '100%',
    background: 'var(--color-surface-container)',
    borderRadius: 'var(--radius)',
    padding: 'var(--space-md)',
  },
  credBtn: {
    width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 8px',
    background: 'var(--color-surface-container-lowest)',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    marginBottom: 4,
    textAlign: 'left',
    transition: 'background 0.12s',
  },
  footer: {
    textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 11,
    color: 'var(--color-on-surface-variant)',
    margin: 0,
    letterSpacing: '-0.01em',
  },
};
