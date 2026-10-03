import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

/* ─── Status badge config (mapped to DB case_status values) ─── */
const STATUS_MAP = {
  open_negotiation:                { label: 'Under Review',          cls: 'badge--review',      escalated: false },
  open_mediation:                  { label: 'In Mediation',          cls: 'badge--in-progress', escalated: false },
  resolved_settlement_negotiation: { label: 'Resolved',              cls: 'badge--resolved',    escalated: false },
  resolved_settlement_mediation:   { label: 'Resolved (Mediated)',   cls: 'badge--resolved',    escalated: false },
  mediation_failed:                { label: 'Escalated',             cls: 'badge--escalated',   escalated: true  },
  closed_referred_rent_authority:  { label: 'Referred to Authority', cls: 'badge--escalated',   escalated: true  },
  closed_withdrawn:                { label: 'Withdrawn',             cls: 'badge--neutral',     escalated: false },
  closed_no_response:              { label: 'Closed',                cls: 'badge--neutral',     escalated: false },
};

const ESCALATED_STATUSES = new Set(['mediation_failed', 'closed_referred_rent_authority']);

const CATEGORY_MAP = {
  security_deposit:    'Security deposit',
  rent_payment:        'Rent payment',
  maintenance:         'Habitability',
  property_damage:     'Property damage',
  agreement_violation: 'Agreement violation',
  eviction_notice:     'Eviction',
  other:               'Other',
};

const FILTERS = [
  { key: 'all',                    label: 'All disputes' },
  { key: 'open_negotiation',       label: 'Under review' },
  { key: 'open_mediation',         label: 'In mediation' },
  { key: 'resolved_settlement_mediation', label: 'Resolved' },
  { key: 'mediation_failed',       label: 'Escalated' },
];

const ROLE_CONFIG = {
  tenant: {
    badge: 'Tenant Grievance Portal',
    title: 'Tenant Dispute & Resolution Dashboard',
    subtitle: 'Track your filed grievances, review mediator-proposed resolutions, and confirm binding settlements.',
    metricLabels: ['My Filings', 'In Mediation', 'Settled Cases', 'Escalations'],
  },
  landlord: {
    badge: 'Property Owner Registry',
    title: 'Landlord Tenancy Dispute Dashboard',
    subtitle: 'Review tenant claims across your rental units, vote on proposed settlement agreements, and monitor dispute status.',
    metricLabels: ['Property Cases', 'In Mediation', 'Settled Agreements', 'Escalated to Court'],
  },
  admin: {
    badge: 'Housing Authority Directorate',
    title: 'Civic Dispute & Escalations Control Center',
    subtitle: 'District-wide caseload oversight, neutral mediator allocations, and statutory Rent Authority enforcement.',
    metricLabels: ['Total Docket', 'Active Mediations', 'Settlements', 'Court Referrals'],
  },
  mediator: {
    badge: 'Neutral Mediation Desk',
    title: 'Mediator Hearing & Resolution Workbench',
    subtitle: 'Manage assigned disputes, draft enforceable settlement proposals, and track party decisions.',
    metricLabels: ['Assigned Cases', 'Hearing Sessions', 'Settlements Signed', 'Referred Cases'],
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    client.get('/disputes').then(r => {
      const list = Array.isArray(r.data?.disputes)
        ? r.data.disputes
        : (Array.isArray(r.data) ? r.data : []);
      setDisputes(list);
    }).catch(() => {
      setDisputes([]);
    }).finally(() => setLoading(false));
  }, []);

  const safeDisputes = Array.isArray(disputes) ? disputes : [];

  const stats = {
    total:     safeDisputes.length,
    active:    safeDisputes.filter(d => ['open_negotiation','open_mediation'].includes(d.case_status)).length,
    resolved:  safeDisputes.filter(d => ['resolved_settlement_mediation','resolved_settlement_negotiation'].includes(d.case_status)).length,
    escalated: safeDisputes.filter(d => ESCALATED_STATUSES.has(d.case_status)).length,
  };

  const filtered = safeDisputes
    .filter(d => {
      const matchFilter = filter === 'all' || d.case_status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q || [d.case_number, d.property_address, d.description]
        .filter(Boolean).some(v => v.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    })
    // §5.1: escalated cases pinned to top regardless of updated_at
    .sort((a, b) => {
      const aEsc = ESCALATED_STATUSES.has(a.case_status) ? 0 : 1;
      const bEsc = ESCALATED_STATUSES.has(b.case_status) ? 0 : 1;
      if (aEsc !== bEsc) return aEsc - bEsc;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const role = user?.role || 'tenant';
  const roleCfg = ROLE_CONFIG[role] || ROLE_CONFIG.tenant;
  const mediationCases = safeDisputes.filter(d => d.case_status === 'open_mediation');
  const escalatedCases = safeDisputes.filter(d => ESCALATED_STATUSES.has(d.case_status));

  return (
    <Layout>
      <div className="page-container">
        {/* Page header */}
        <header style={s.pageHeader} className="page-header-row">
          <div>
            <div style={s.breadcrumb}>
              <span>{roleCfg.badge}</span>
              <span>•</span>
              <span>Docket Session Q{new Date().getMonth() < 3 ? 1 : new Date().getMonth() < 6 ? 2 : new Date().getMonth() < 9 ? 3 : 4}</span>
            </div>
            <h1 style={s.pageTitle}>{roleCfg.title}</h1>
            <p style={s.pageSubtitle}>
              {roleCfg.subtitle}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
            <button className="btn btn-outline btn-sm">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
              Export Docket
            </button>
            {(user?.role === 'tenant' || user?.role === 'landlord') && (
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/file-dispute')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                File a new dispute
              </button>
            )}
          </div>
        </header>

        {/* ── Role-Specific Action Banners ── */}
        {(role === 'tenant' || role === 'landlord') && mediationCases.length > 0 && (
          <div className="card" style={{ padding: 'var(--space-md) var(--space-lg)', background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.6) 0%, rgba(253, 230, 138, 0.35) 100%)', border: '1px solid #f59e0b', borderLeft: '6px solid #d97706', marginBottom: 'var(--space-lg)', borderRadius: 'var(--radius)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 30, color: '#d97706' }}>gavel</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#92400e', fontSize: '1rem' }}>
                    {role === 'tenant' ? 'Mediation Action Required — Review Proposed Resolution' : 'Mediation Action Required — Review Proposed Settlement'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#78350f', marginTop: 2 }}>
                    A mediator has proposed binding terms for <strong>Case #{mediationCases[0].case_number}</strong>. Review and vote to finalize agreement.
                  </div>
                </div>
              </div>
              <button
                className="btn btn-sm"
                style={{ background: '#d97706', color: '#fff', fontWeight: 600, padding: '8px 16px' }}
                onClick={() => navigate(`/cases/${mediationCases[0].id}`)}
              >
                Review Proposal →
              </button>
            </div>
          </div>
        )}

        {role === 'admin' && escalatedCases.length > 0 && (
          <div className="card" style={{ padding: 'var(--space-md) var(--space-lg)', background: 'rgba(254, 226, 226, 0.5)', border: '1px solid var(--status-escalated-border)', borderLeft: '6px solid var(--status-escalated-border)', marginBottom: 'var(--space-lg)', borderRadius: 'var(--radius)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 30, color: 'var(--status-escalated-border)' }}>report_problem</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '1rem' }}>
                    Rent Authority Escalation — {escalatedCases.length} Case(s) Referred
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#7f1d1d', marginTop: 2 }}>
                    Mediation was unsuccessful. Certified case bundles are ready for statutory transfer.
                  </div>
                </div>
              </div>
              <button
                className="btn btn-sm btn-destructive"
                onClick={() => setFilter('mediation_failed')}
              >
                View Escalated Docket →
              </button>
            </div>
          </div>
        )}

        <section className="dashboard-metrics-grid">
          <MetricCard
            label={roleCfg.metricLabels[0]}
            value={stats.total}
            suffix={role === 'tenant' ? 'grievances' : role === 'landlord' ? 'units filed' : 'registered'}
            icon="folder"
            stripe="card-stripe--primary"
            footer={<><span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_up</span> {role === 'admin' ? 'District caseload' : 'Total records'}</>}
          />
          <MetricCard
            label={roleCfg.metricLabels[1]}
            value={stats.active}
            suffix="pending"
            icon="gavel"
            stripe="card-stripe--in-progress"
            valueColor="var(--color-secondary)"
            footer={<span>{mediationCases.length} in mediation · {safeDisputes.filter(d => d.case_status === 'open_negotiation').length} in review</span>}
          />
          <MetricCard
            label={roleCfg.metricLabels[2]}
            value={stats.resolved}
            suffix="settled"
            icon="verified"
            stripe="card-stripe--resolved"
            footer={<><span className="material-symbols-outlined" style={{ fontSize: 14 }}>task_alt</span> {stats.total ? Math.round(stats.resolved / stats.total * 100) : 0}% settlement rate</>}
          />
          <MetricCard
            label={roleCfg.metricLabels[3]}
            value={stats.escalated}
            suffix="failed / court"
            icon="warning"
            stripe="card-stripe--escalated"
            valueColor="var(--status-escalated-border)"
            footer={<><span className="material-symbols-outlined" style={{ fontSize: 14 }}>gavel</span> Rent Authority referral</>}
          />
        </section>


        {/* Cases worklist */}
        <section style={s.tableCard}>
          {/* Table toolbar */}
          <div style={s.tableToolbar}>
            <div>
              <h2 style={s.sectionTitle}>Recent case activity</h2>
              <p style={s.sectionSub}>Review filings, upcoming mediation milestones, and official registry updates.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Filter tabs */}
              <nav style={s.filterBar}>
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    style={{ ...s.filterBtn, ...(filter === f.key ? s.filterBtnActive : {}) }}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </nav>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={s.tableSearchIcon}>filter_list</span>
                <input
                  type="text"
                  placeholder="Filter current list..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={s.tableSearch}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="responsive-table-container">
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Case ID & Property</th>
                  <th style={s.th}>Category</th>
                  <th style={s.th}>Parties involved</th>
                  <th style={s.th}>Filed</th>
                  <th style={s.th}>Status</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Docket action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={s.emptyCell}>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: 24 }}>progress_activity</span>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={s.emptyCell}>No disputes found.</td></tr>
                ) : filtered.map((d, i) => {
                  const st = STATUS_MAP[d.case_status] || STATUS_MAP['open_negotiation'];
                  const isEsc = ESCALATED_STATUSES.has(d.case_status);
                  return (
                    <tr
                      key={d.id}
                      style={{
                        ...s.tr,
                        background: isEsc ? 'rgba(254,226,226,0.35)' : i % 2 === 0 ? 'var(--color-surface-container-lowest)' : 'rgba(244,243,241,0.3)',
                        borderLeft: isEsc ? '6px solid var(--status-escalated-border)' : '6px solid transparent',
                      }}
                    >
                      <td style={s.td}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 'var(--text-label-md-size)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                            {d.case_number}
                            {isEsc && <span className="tag-escalated"><span className="material-symbols-outlined" style={{ fontSize: 10 }}>warning</span> Escalated</span>}
                          </div>
                          <div style={{ fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface)', marginTop: 2 }}>{d.property_address}</div>
                          <div style={{ fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description?.slice(0, 60)}</div>
                        </div>
                      </td>
                      <td style={s.td}>
                        <span className="badge badge--neutral" style={{ fontSize: 11 }}>
                          {CATEGORY_MAP[d.category] || d.category || 'General'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <div style={{ fontSize: 'var(--text-label-sm-size)' }}>
                          <div style={{ fontWeight: 500, color: 'var(--color-on-surface)' }}>
                            {d.filed_by?.name || 'Complainant'} <span style={{ color: 'var(--color-on-surface-variant)', fontWeight: 400 }}>({d.filed_by?.role || 'Party'})</span>
                          </div>
                          <div style={{ color: 'var(--color-on-surface-variant)' }}>
                            vs. {d.opposing_party?.name || 'Respondent'} <span>({d.opposing_party?.role || 'Party'})</span>
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)' }}>
                          {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day:'2-digit', month: 'short', year: '2-digit' }) : '—'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <button
                          onClick={() => navigate(`/cases/${d.id}`)}
                          style={{
                            ...s.viewLink,
                            ...(d.case_status === 'open_mediation' && (role === 'tenant' || role === 'landlord')
                              ? { color: '#b45309', fontWeight: 600 }
                              : ['resolved_settlement_mediation', 'resolved_settlement_negotiation'].includes(d.case_status)
                              ? { color: 'var(--status-resolved-border)', fontWeight: 600 }
                              : isEsc
                              ? { color: 'var(--status-escalated-border)', fontWeight: 600 }
                              : {})
                          }}
                        >
                          {d.case_status === 'open_mediation' && (role === 'tenant' || role === 'landlord')
                            ? 'Review & Vote'
                            : d.case_status === 'open_mediation' && role === 'mediator'
                            ? 'Manage Session'
                            : ['resolved_settlement_mediation', 'resolved_settlement_negotiation'].includes(d.case_status)
                            ? 'View Settlement'
                            : isEsc
                            ? 'View Escalation'
                            : 'View details'}
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div style={s.tableFoot}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>shield</span>
              All records certified under District Municipal Rental Ordinance • Section 14-C
            </div>
            <span style={{ fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)' }}>
              Showing {filtered.length} of {safeDisputes.length} cases
            </span>
          </div>
        </section>

        {/* Info cards */}
        <section className="dashboard-info-grid">
          <InfoCard icon="support_agent" title="Duty Legal Counsel" body="Tenants and unrepresented landlords are entitled to 30 minutes of impartial procedural consultation prior to formal negotiation." footer="Available: 9:00 AM - 4:00 PM" action="Request counsel" />
          <InfoCard icon="policy" title="Statutory Timelines" body="Security deposit withholdings must include itemized ledger receipts uploaded within 14 calendar days of lease termination." footer="Housing Code § 22-A" action="View regulations" />
          <InfoCard icon="history_edu" title="Signed Settlements" body="All mediated voluntary agreements are registered with the clerk and possess legally binding enforceability upon signature." footer="Ward 4 Clerk Certified" action="Review archive" />
        </section>
      </div>
    </Layout>
  );
}

function MetricCard({ label, value, suffix, icon, stripe, valueColor, footer }) {
  return (
    <div className={`card card-stripe ${stripe}`} style={s.metricCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={s.metricLabel}>{label}</div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ ...s.metricValue, color: valueColor || 'var(--color-primary)' }}>{value}</span>
            <span style={s.metricSuffix}>{suffix}</span>
          </div>
        </div>
        <div style={s.metricIcon}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
        </div>
      </div>
      <div style={s.metricFooter}>{footer}</div>
    </div>
  );
}

function InfoCard({ icon, title, body, footer, action }) {
  return (
    <div className="card" style={s.infoCard}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontWeight: 600, fontSize: 'var(--text-label-md-size)', marginBottom: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
          {title}
        </div>
        <p style={{ fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.5 }}>{body}</p>
      </div>
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)' }}>{footer}</span>
        <a href="#" style={{ fontSize: 'var(--text-label-sm-size)', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>{action}</a>
      </div>
    </div>
  );
}

const s = {
  page: { maxWidth: 1280, margin: '0 auto', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' },
  pageHeader: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-md)' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  pageTitle: { ...Object.fromEntries([['margin', '0 0 6px 0']]), fontFamily: 'var(--font-serif)', fontSize: 'var(--text-headline-xl-size)', lineHeight: 'var(--text-headline-xl-lh)', letterSpacing: 'var(--text-headline-xl-ls)', fontWeight: 600, color: 'var(--color-primary)' },
  pageSubtitle: { margin: 0, fontSize: 'var(--text-body-md-size)', color: 'var(--color-on-surface-variant)' },

  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-lg)' },
  metricCard: { padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 110 },
  metricLabel: { fontSize: 'var(--text-label-sm-size)', fontWeight: 500, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  metricValue: { fontFamily: 'var(--font-serif)', fontSize: '2.25rem', lineHeight: 1, fontWeight: 600 },
  metricSuffix: { fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)', fontWeight: 500 },
  metricIcon: { padding: 8, borderRadius: 'var(--radius)', background: 'var(--color-surface-container-low)', color: 'var(--color-primary)' },
  metricFooter: { marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)', fontWeight: 500 },

  tableCard: { background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' },
  tableToolbar: { padding: 'var(--space-lg)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)', borderBottom: '1px solid var(--color-surface-container)' },
  sectionTitle: { fontFamily: 'var(--font-serif)', fontSize: 'var(--text-headline-md-size)', fontWeight: 600, color: 'var(--color-primary)', margin: '0 0 4px 0' },
  sectionSub: { fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', margin: 0 },

  filterBar: { display: 'flex', alignItems: 'center', background: 'var(--color-surface-container-low)', padding: 4, borderRadius: 6, gap: 2 },
  filterBtn: { padding: '6px 12px', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  filterBtnActive: { background: 'var(--color-surface-container-lowest)', color: 'var(--color-primary)', fontWeight: 600, boxShadow: 'var(--shadow-sm)' },

  tableSearchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--color-on-surface-variant)', pointerEvents: 'none' },
  tableSearch: { height: 32, paddingLeft: 30, paddingRight: 12, background: 'var(--color-surface-container-low)', border: '1px solid transparent', borderRadius: 4, fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface)', outline: 'none', width: 200 },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-sm-size)' },
  thead: { background: 'var(--color-surface-container-low)' },
  th: { padding: '12px var(--space-md)', fontSize: 'var(--text-label-sm-size)', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', whiteSpace: 'nowrap' },
  tr: { transition: 'background 0.12s', cursor: 'default' },
  td: { padding: '16px var(--space-md)', verticalAlign: 'top', borderBottom: '1px solid var(--color-surface-container)' },
  emptyCell: { padding: 40, textAlign: 'center', color: 'var(--color-on-surface-variant)' },

  viewLink: { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-secondary)', fontSize: 'var(--text-label-sm-size)', fontWeight: 600, padding: 0 },

  tableFoot: { padding: 'var(--space-md) var(--space-lg)', background: 'var(--color-surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },

  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-lg)' },
  infoCard: { padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
};
