import React from 'react';
import Layout from '../components/Layout.jsx';

export default function SupportHelp() {
  return (
    <Layout>
      <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)' }}>
          <span>Statutory Resources</span>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Support & Help Center</span>
        </div>

        <div className="card" style={{ padding: 'var(--space-xl)', background: 'var(--color-surface-container-lowest)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-secondary)', fontSize: 'var(--text-label-sm-size)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>support_agent</span>
            <span>Civic Ombudsman Help Desk</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-headline-xl-size)', color: 'var(--color-primary)', margin: '0 0 8px 0' }}>
            Support & Civic Dispute Assistance
          </h1>
          <p style={{ fontSize: 'var(--text-body-md-size)', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.6 }}>
            Guidance on mediation timelines, evidence disclosure requirements, and statutory housing court escalations under Ward 4 jurisdiction.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
          <div className="card" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--color-surface-container)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <span className="material-symbols-outlined">call</span>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--color-primary)' }}>Emergency Intake Line</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
              For unlawful lockouts, severe utility cutoffs, or emergency health hazards.
            </p>
            <a href="tel:311" className="btn btn-outline btn-sm" style={{ color: 'var(--color-secondary)' }}>
              Call 311 (24/7 Hotline)
            </a>
          </div>

          <div className="card" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--color-surface-container)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <span className="material-symbols-outlined">mail</span>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--color-primary)' }}>Clerk of Docket Inquiries</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
              Case docket status, evidence certification, and certified transcript requests.
            </p>
            <a href="mailto:clerk.casefiles@tldrp.gov" className="btn btn-outline btn-sm">
              clerk.casefiles@tldrp.gov
            </a>
          </div>

          <div className="card" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--color-surface-container)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <span className="material-symbols-outlined">meeting_room</span>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--color-primary)' }}>Ward 4 Civic Chambers</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
              Municipal Housing Authority building, 4th Floor Registry. Mon-Fri 9AM-5PM.
            </p>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>Walk-in mediation filings accepted</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
