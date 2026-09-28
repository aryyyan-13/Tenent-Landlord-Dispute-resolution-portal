import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import client from '../api/client.js';

const CATEGORIES = [
  { id: 'security_deposit', icon: 'payments',       label: 'Security Deposit', desc: 'Failure to return deposit within 14 days' },
  { id: 'maintenance',      icon: 'home_repair_service', label: 'Habitability & Maintenance', desc: 'No heat, water leaks, or safety hazards' },
  { id: 'eviction',         icon: 'gavel',          label: 'Eviction Protection', desc: 'Unlawful detainer or notice disputes' },
  { id: 'lease',            icon: 'description',    label: 'Lease Terms', desc: 'Disagreements over lease clauses' },
  { id: 'noise',            icon: 'volume_up',      label: 'Noise & Nuisance', desc: 'Quiet enjoyment violations' },
  { id: 'other',            icon: 'help_outline',   label: 'Other Grievance', desc: 'Matters not classified above' },
];

export default function FileDispute() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'security_deposit',
    amount: '',
    property_address: '',
    respondent_name: '',
    respondent_email: '',
    respondent_role: 'landlord', // default
  });

  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (step < 4) {
      setStep(s => s + 1);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/disputes', formData);
      navigate(`/cases/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to file dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={s.page}>
        {/* Context bar */}
        <div style={s.contextBar}>
          <div style={s.breadcrumb}>
            <span>Civic Docket</span>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
            <span>Mediation Registry</span>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
            <span style={{ color: 'var(--color-on-surface)', fontWeight: 600 }}>Form DIR-104 (Filing Protocol)</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 'var(--text-label-sm-size)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--color-secondary)' }}>lock</span>
              Statutory Privilege: Encrypted
            </span>
            <span style={{ color: 'var(--color-outline-variant)' }}>|</span>
            <span style={{ color: 'var(--color-secondary)', fontWeight: 500 }}>Session ID: #{Math.floor(1000 + Math.random()*9000)}-Q4</span>
          </div>
        </div>

        {/* Header */}
        <div style={s.headerRow}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 'var(--text-label-sm-size)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-secondary)', fontWeight: 600 }}>Official Grievance Intake</span>
              <span style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--color-surface-container)', fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)' }}>Section 8.4 Jurisdiction</span>
            </div>
            <h1 style={s.title}>File a dispute</h1>
            <p style={s.subtitle}>Submit a formal petition for civic mediation. All submissions are reviewed by certified housing ombudsmen within 48 hours.</p>
          </div>
          <div className="card" style={s.velocityBadge}>
            <div style={s.velIcon}><span className="material-symbols-outlined">schedule</span></div>
            <div>
              <div style={s.velLabel}>Current Queue Velocity</div>
              <div style={s.velValue}>~31 hrs average</div>
              <div style={s.velFoot}>Ward 4 Intake Bench Active</div>
            </div>
          </div>
        </div>

        {/* Tracker */}
        <div className="card" style={s.tracker}>
          <div style={s.trackerRail} />
          <div style={s.trackerSteps}>
            <Step num={1} label="Classification" desc="Category & address" current={step} />
            <Step num={2} label="Grievance Details" desc="Narrative & claims" current={step} />
            <Step num={3} label="Respondent Info" desc="Opposing party" current={step} />
            <Step num={4} label="Review & Submit" desc="Oath & signature" current={step} />
          </div>
        </div>

        {/* Form container */}
        <div style={{ maxWidth: 800 }}>
          <form onSubmit={submit} className="card" style={{ padding: 'var(--space-xl)' }}>
            {error && (
              <div style={{ padding: 12, background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', borderRadius: 8, marginBottom: 24, fontSize: 'var(--text-body-sm-size)', border: '1px solid var(--color-error)' }}>
                {error}
              </div>
            )}

            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div>
                  <h2 style={s.stepTitle}>Step 1. Dispute classification</h2>
                  <p style={s.stepSub}>Select the statutory category that best describes your grievance.</p>
                </div>
                <div style={s.catGrid}>
                  {CATEGORIES.map(c => (
                    <label key={c.id} style={{ ...s.catCard, ...(formData.category === c.id ? s.catCardActive : {}) }}>
                      <input type="radio" name="category" value={c.id} checked={formData.category === c.id} onChange={(e) => update('category', e.target.value)} style={{ display: 'none' }} />
                      <span className="material-symbols-outlined" style={{ fontSize: 24, color: formData.category === c.id ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>{c.icon}</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', fontSize: 'var(--text-label-md-size)' }}>{c.label}</div>
                      <div style={{ fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', lineHeight: 1.4 }}>{c.desc}</div>
                    </label>
                  ))}
                </div>
                <div>
                  <label style={s.label}>Property Address involved in dispute *</label>
                  <input required className="input" value={formData.property_address} onChange={e => update('property_address', e.target.value)} placeholder="e.g. 123 Main St, Apt 4B, City, State ZIP" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div>
                  <h2 style={s.stepTitle}>Step 2. Grievance details</h2>
                  <p style={s.stepSub}>Provide a concise factual summary of your claim.</p>
                </div>
                <div>
                  <label style={s.label}>Case Title (Brief) *</label>
                  <input required className="input" value={formData.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Unreturned Security Deposit" />
                </div>
                <div>
                  <label style={s.label}>Detailed Description of Dispute *</label>
                  <textarea required className="input" style={{ height: 160 }} value={formData.description} onChange={e => update('description', e.target.value)} placeholder="Provide chronological facts. Do not include emotional language. Be specific with dates and communications..." />
                </div>
                <div>
                  <label style={s.label}>Financial Claim Amount ($)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--color-on-surface-variant)' }}>$</span>
                    <input type="number" step="0.01" className="input" style={{ paddingLeft: 24, maxWidth: 200 }} value={formData.amount} onChange={e => update('amount', e.target.value)} placeholder="0.00" />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div>
                  <h2 style={s.stepTitle}>Step 3. Respondent information</h2>
                  <p style={s.stepSub}>Identify the opposing party. They will be notified via email.</p>
                </div>
                <div>
                  <label style={s.label}>Respondent Role *</label>
                  <select required className="input" style={{ maxWidth: 240 }} value={formData.respondent_role} onChange={e => update('respondent_role', e.target.value)}>
                    <option value="landlord">Landlord / Property Manager</option>
                    <option value="tenant">Tenant</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Full Legal Name or Business Entity *</label>
                  <input required className="input" value={formData.respondent_name} onChange={e => update('respondent_name', e.target.value)} placeholder="e.g. Acme Properties LLC or John Doe" />
                </div>
                <div>
                  <label style={s.label}>Email Address *</label>
                  <input required type="email" className="input" value={formData.respondent_email} onChange={e => update('respondent_email', e.target.value)} placeholder="Required for civic notification" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div>
                  <h2 style={s.stepTitle}>Step 4. Final review & Oath</h2>
                  <p style={s.stepSub}>Verify your submission before lodging it in the public registry.</p>
                </div>
                <div style={{ background: 'var(--color-surface-container-low)', padding: 'var(--space-md)', borderRadius: 8, fontSize: 'var(--text-body-sm-size)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>Category:</span>
                    <span style={{ fontWeight: 500 }}>{CATEGORIES.find(c => c.id === formData.category)?.label}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>Address:</span>
                    <span style={{ fontWeight: 500 }}>{formData.property_address}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>Respondent:</span>
                    <span style={{ fontWeight: 500 }}>{formData.respondent_name} ({formData.respondent_email})</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>Claim:</span>
                    <span style={{ fontWeight: 500 }}>${formData.amount || '0.00'}</span>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'var(--color-secondary-fixed)', padding: 'var(--space-md)', borderRadius: 8, cursor: 'pointer' }}>
                  <input required type="checkbox" style={{ marginTop: 4, width: 18, height: 18, accentColor: 'var(--color-primary)' }} />
                  <span style={{ fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-secondary-fixed)' }}>
                    <strong>Statutory Oath:</strong> I declare under penalty of perjury under the laws of this municipality that the foregoing is true and correct. I understand this initiates a formal mediation process.
                  </span>
                </label>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-outline-variant)' }}>
              {step > 1 ? (
                <button type="button" className="btn btn-outline" onClick={() => setStep(s => s - 1)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span> Previous
                </button>
              ) : <div />}
              
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? (
                  <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span> Submitting...</>
                ) : step === 4 ? (
                  <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>gavel</span> File Official Dispute</>
                ) : (
                  <>Continue <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span></>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

function Step({ num, label, desc, current }) {
  const isPast = num < current;
  const isCurrent = num === current;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 1, gap: 8, width: '25%' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'var(--text-label-sm-size)', fontWeight: 600,
        background: isCurrent ? 'var(--color-primary-container)' : isPast ? 'var(--color-secondary)' : 'var(--color-surface-container-highest)',
        color: (isCurrent || isPast) ? 'white' : 'var(--color-on-surface-variant)',
        border: '4px solid var(--color-surface-container-lowest)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {isPast ? <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span> : num}
      </div>
      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: isCurrent ? 'var(--color-secondary)' : 'var(--color-on-surface-variant)', fontWeight: 600, marginBottom: 2 }}>Step {num}</div>
        <div style={{ fontSize: 'var(--text-label-sm-size)', fontWeight: 600, color: isCurrent ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 2, display: 'none' /* hidden on mobile typically, let's just omit or keep simple */ }}>{desc}</div>
      </div>
    </div>
  );
}

const s = {
  page: { maxWidth: 1000, margin: '0 auto', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' },
  contextBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--color-surface-container-high)', flexWrap: 'wrap' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)' },
  
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-md)' },
  title: { fontFamily: 'var(--font-serif)', fontSize: 'var(--text-headline-lg-size)', color: 'var(--color-primary)', letterSpacing: '-0.015em', margin: '0 0 4px 0' },
  subtitle: { fontSize: 'var(--text-body-md-size)', color: 'var(--color-on-surface-variant)', margin: 0, maxWidth: 600 },
  
  velocityBadge: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)' },
  velIcon: { width: 40, height: 40, borderRadius: 4, background: 'var(--color-surface-container)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  velLabel: { fontSize: 'var(--text-label-sm-size)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)' },
  velValue: { fontSize: 'var(--text-headline-sm-size)', fontFamily: 'var(--font-serif)', color: 'var(--color-primary)', fontWeight: 600 },
  velFoot: { fontSize: 'var(--text-label-sm-size)', color: 'var(--color-secondary)' },

  tracker: { padding: 'var(--space-lg)', position: 'relative' },
  trackerRail: { position: 'absolute', top: 34, left: '12.5%', right: '12.5%', height: 2, background: 'var(--color-surface-container-high)', zIndex: 0 },
  trackerSteps: { display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 },

  stepTitle: { fontFamily: 'var(--font-serif)', fontSize: 'var(--text-headline-md-size)', color: 'var(--color-primary)', margin: '0 0 4px 0' },
  stepSub: { fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', margin: 0 },
  label: { display: 'block', fontSize: 'var(--text-label-sm-size)', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: 6 },
  
  catGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' },
  catCard: { display: 'flex', flexDirection: 'column', gap: 8, padding: 'var(--space-md)', borderRadius: 8, border: '1px solid var(--color-outline-variant)', cursor: 'pointer', background: 'var(--color-surface-container-lowest)', transition: 'border-color 0.15s' },
  catCardActive: { borderColor: 'var(--color-primary)', boxShadow: '0 0 0 1px var(--color-primary)', background: 'var(--color-surface)' },
};
