import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import client from '../api/client.js';

const STATUS_MAP = {
  'filed':       { label: 'Under review',       cls: 'badge--review' },
  'in_mediation':{ label: 'In mediation',        cls: 'badge--in-progress' },
  'resolved':    { label: 'Resolved',            cls: 'badge--resolved' },
  'escalated':   { label: 'Escalated to court',  cls: 'badge--escalated' },
  'closed':      { label: 'Resolved',            cls: 'badge--resolved' },
};

const CATEGORY_MAP = {
  security_deposit: 'Security deposit',
  maintenance:      'Habitability',
  eviction:         'Eviction protection',
  lease:            'Lease terms',
  noise:            'Quiet enjoyment',
  other:            'Other',
};

export default function CaseTracking() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    client.get('/disputes').then(r => {
      setDisputes(r.data.disputes || r.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const stats = {
    active:   disputes.filter(d => ['filed','in_mediation'].includes(d.status)).length,
    total:    disputes.length,
    resolved: disputes.filter(d => ['resolved','closed'].includes(d.status)).length,
  };

  const filtered = disputes.filter(d => {
    const q = search.toLowerCase();
    return !q || [d.case_number, d.property_address, d.title, d.complainant_name, d.respondent_name]
      .filter(Boolean).some(v => v.toLowerCase().includes(q));
  });

  return (
    <Layout>
      <div style={s.page}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Header */}
          <div style={s.headerRow}>
            <div>
              <div style={s.breadcrumb}>
                <span style={{ color: 'var(--color-primary)' }}>Ward 4 Mediation Registry</span>
                <span style={{ color: 'var(--color-outline-variant)' }}>/</span>
                <span>Municipal Docket Directory</span>
                <span style={{ color: 'var(--color-outline-variant)' }}>/</span>
                <span style={{ color: 'var(--color-secondary)' }}>Active Session {new Date().getFullYear()}-Q{Math.ceil((new Date().getMonth()+1)/3)}</span>
              </div>
              <h1 style={s.title}>Case tracking directory</h1>
              <p style={s.subtitle}>
                Search, inspect, and monitor all dispute dockets under official municipal mediation pursuant to Statutory Ordinance §18-B. Impartial public records registry.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="btn btn-outline" style={{ background: 'var(--color-surface-container-lowest)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-secondary)' }}>file_download</span>
                Export docket report (CSV)
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/file-dispute')}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
                Initiate intake
              </button>
            </div>
          </div>

          {/* Metric Vignettes */}
          <div style={s.vignetteGrid}>
            <div className="card" style={s.vignette}>
              <div>
                <div style={s.vigLabel}>Active Caseload</div>
                <div style={s.vigValue}>{stats.active} <span style={s.vigSub}>/ {stats.total} total</span></div>
                <div style={{ ...s.vigFoot, color: 'var(--color-secondary)' }}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>trending_flat</span> {disputes.filter(d=>d.status==='filed').length} awaiting hearing</div>
              </div>
              <div style={s.vigIcon}><span className="material-symbols-outlined text-primary">balance</span></div>
            </div>
            <div className="card" style={s.vignette}>
              <div>
                <div style={s.vigLabel}>Avg Resolution Time</div>
                <div style={s.vigValue}>18.4 <span style={s.vigSub}>days</span></div>
                <div style={s.vigFoot}><span className="material-symbols-outlined" style={{ fontSize: 12, color: 'var(--color-secondary)' }}>verified</span> Municipal target: ≤ 21d</div>
              </div>
              <div style={{ ...s.vigIcon, color: 'var(--color-secondary)' }}><span className="material-symbols-outlined">timer</span></div>
            </div>
            <div className="card" style={s.vignette}>
              <div>
                <div style={s.vigLabel}>Conciliation Rate</div>
                <div style={s.vigValue}>{stats.total ? Math.round((stats.resolved/stats.total)*100) : 0}%</div>
                <div style={s.vigFoot}><span className="material-symbols-outlined" style={{ fontSize: 12, color: 'var(--color-secondary)' }}>trending_up</span> +2.4% vs last quarter</div>
              </div>
              <div style={{ ...s.vigIcon, color: '#15803D' }}><span className="material-symbols-outlined">handshake</span></div>
            </div>
            <div className="card" style={s.vignette}>
              <div>
                <div style={s.vigLabel}>Pending Hearings</div>
                <div style={s.vigValue}>12</div>
                <div style={s.vigFoot}><span className="material-symbols-outlined" style={{ fontSize: 12, color: 'var(--color-secondary)' }}>calendar_month</span> Next: Oct 24, 9:00 AM</div>
              </div>
              <div style={{ ...s.vigIcon, color: 'var(--color-on-surface-variant)' }}><span className="material-symbols-outlined">event_available</span></div>
            </div>
          </div>

          {/* Table Area */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={s.tableHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <div style={s.searchWrap}>
                  <span className="material-symbols-outlined" style={s.searchIcon}>search</span>
                  <input
                    type="text"
                    placeholder="Search by Docket #, Address, or Party..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="input"
                    style={{ paddingLeft: 34, height: 36, width: 320 }}
                  />
                </div>
                <button className="btn btn-outline" style={{ height: 36, padding: '0 12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>tune</span> Filters
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    <th style={s.th}>Docket Number</th>
                    <th style={s.th}>Property Location</th>
                    <th style={s.th}>Filing Date</th>
                    <th style={s.th}>Category</th>
                    <th style={s.th}>Claim Amount</th>
                    <th style={s.th}>Current Status</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={s.emptyCell}><span className="material-symbols-outlined animate-spin">progress_activity</span></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={s.emptyCell}>No cases found.</td></tr>
                  ) : filtered.map((d, i) => {
                    const st = STATUS_MAP[d.status] || STATUS_MAP['filed'];
                    return (
                      <tr key={d.id} style={{ ...s.tr, background: i % 2 === 0 ? 'var(--color-surface-container-lowest)' : 'rgba(244,243,241,0.3)' }}>
                        <td style={s.td}>
                          <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{d.case_number}</div>
                          {d.status === 'in_mediation' && (
                            <div style={{ fontSize: 11, color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', gap: 2, marginTop: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span> Priority
                            </div>
                          )}
                        </td>
                        <td style={s.td}>
                          <div style={{ color: 'var(--color-on-surface)' }}>{d.property_address || 'Unspecified'}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>{d.title}</div>
                        </td>
                        <td style={s.td}>
                          <div style={{ color: 'var(--color-on-surface)' }}>
                            {d.created_at ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </div>
                        </td>
                        <td style={s.td}>
                          {CATEGORY_MAP[d.category] || d.category || 'General'}
                        </td>
                        <td style={s.td}>
                          {d.amount ? `$${parseFloat(d.amount).toFixed(2)}` : '—'}
                        </td>
                        <td style={s.td}>
                          <span className={`badge ${st.cls}`}>{st.label}</span>
                        </td>
                        <td style={{ ...s.td, textAlign: 'right' }}>
                          <button onClick={() => navigate(`/cases/${d.id}`)} style={s.viewLink}>
                            Inspect <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={s.tableFoot}>
              <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Showing {filtered.length} of {disputes.length} records</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-outline btn-sm" disabled>Prev</button>
                <button className="btn btn-outline btn-sm" disabled>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const s = {
  page: { maxWidth: 1280, margin: '0 auto', padding: 'var(--space-xl)' },
  headerRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--space-md)' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-label-sm-size)', fontWeight: 500, marginBottom: 4 },
  title: { fontFamily: 'var(--font-serif)', fontSize: 'var(--text-headline-xl-size)', color: 'var(--color-primary-container)', letterSpacing: '-0.02em', margin: '0 0 4px 0' },
  subtitle: { fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', maxWidth: 768, margin: 0, lineHeight: 1.5 },

  vignetteGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)' },
  vignette: { padding: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  vigLabel: { fontSize: 'var(--text-label-sm-size)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: 'var(--color-on-surface-variant)' },
  vigValue: { fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: 4 },
  vigSub: { fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body-sm-size)', fontWeight: 400, color: 'var(--color-on-surface-variant)' },
  vigFoot: { fontSize: 'var(--text-label-sm-size)', fontWeight: 500, color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 },
  vigIcon: { width: 40, height: 40, borderRadius: 8, background: 'var(--color-surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  tableHeader: { padding: 'var(--space-md)', background: 'var(--color-surface-container-lowest)', borderBottom: '1px solid var(--color-outline-variant)' },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--color-on-surface-variant)', pointerEvents: 'none' },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-sm-size)' },
  thead: { background: 'var(--color-surface-container-lowest)', borderBottom: '1px solid var(--color-outline-variant)' },
  th: { padding: '12px var(--space-md)', fontSize: 'var(--text-label-sm-size)', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', whiteSpace: 'nowrap' },
  tr: { transition: 'background 0.12s' },
  td: { padding: '12px var(--space-md)', borderBottom: '1px solid var(--color-surface-container)' },
  emptyCell: { padding: 40, textAlign: 'center', color: 'var(--color-on-surface-variant)' },

  viewLink: { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 'var(--text-label-sm-size)', fontWeight: 600, padding: '4px 8px', borderRadius: 4 },
  tableFoot: { padding: '12px var(--space-md)', background: 'var(--color-surface-container-lowest)', borderTop: '1px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
};
