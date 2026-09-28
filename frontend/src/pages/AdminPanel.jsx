import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  
  const [stats, setStats] = useState({ total_cases: 0, active_cases: 0, resolved_cases: 0, users_count: 0 });
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    Promise.all([
      client.get('/admin/stats'),
      client.get('/admin/users'),
      client.get('/disputes'),
      client.get('/admin/rental-agreements')
    ]).then(([st, us, ds, ag]) => {
      setStats(st.data);
      setUsers(us.data.users || us.data);
      setDisputes(ds.data.disputes || ds.data);
      setAgreements(ag.data.agreements || ag.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const pendingKycCount = users.filter(u => u.kyc_status === 'pending').length;
  const unassignedCases = disputes.filter(d => !d.mediator_id).length;

  return (
    <Layout>
      <div style={s.page}>
        {/* Header */}
        <div style={s.headerRow}>
          <div>
            <div style={s.breadcrumb}>
              <span>Municipal Administrative Portal</span>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
              <span>Executive Division</span>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Oversight & Case Governance</span>
            </div>
            <h1 style={s.title}>Portal administration & civic oversight</h1>
            <p style={s.subtitle}>Monitor resolution efficiency, enforce judicial standards, manage user credentials, and assign dispute mediators.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, background: 'var(--color-surface-container-high)', padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-secondary)' }} />
              Statutory Session: Q{Math.ceil((new Date().getMonth()+1)/3)} {new Date().getFullYear()}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Audit Registry #MHA-0941</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignSelf: 'flex-start', marginBottom: 'var(--space-md)' }}>
          <button className="btn btn-outline"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span> Export Docket</button>
          <button className="btn btn-primary"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_moderator</span> Issue Mediator Credential</button>
        </div>

        {/* Tabs */}
        <div style={s.tabBar}>
          <Tab id="analytics" active={activeTab} set={setActiveTab} icon="monitoring" label="Analytics & reports" badge="Live" badgeColor="var(--color-secondary-fixed)" badgeText="var(--color-on-secondary-fixed)" />
          <Tab id="users" active={activeTab} set={setActiveTab} icon="badge" label="User management & KYC" badge={pendingKycCount ? `${pendingKycCount} pending` : null} />
          <Tab id="cases" active={activeTab} set={setActiveTab} icon="balance" label="All dispute cases" badge={unassignedCases ? `${unassignedCases} unassigned` : null} />
          <Tab id="agreements" active={activeTab} set={setActiveTab} icon="description" label="Rental Agreements" />
        </div>

        {/* Tab Content */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}><span className="material-symbols-outlined animate-spin" style={{ fontSize: 24 }}>progress_activity</span></div>
        ) : (
          <div>
            {activeTab === 'analytics' && <AnalyticsTab stats={stats} disputes={disputes} />}
            {activeTab === 'users' && <UsersTab users={users} setUsers={setUsers} />}
            {activeTab === 'cases' && <CasesTab disputes={disputes} setDisputes={setDisputes} />}
            {activeTab === 'agreements' && <AgreementsTab agreements={agreements} setAgreements={setAgreements} />}
          </div>
        )}
      </div>
    </Layout>
  );
}

function Tab({ id, active, set, icon, label, badge, badgeColor, badgeText }) {
  const isActive = active === id;
  return (
    <button onClick={() => set(id)} style={{ ...s.tabBtn, ...(isActive ? s.tabBtnActive : {}) }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: isActive ? 'var(--color-secondary)' : 'inherit' }}>{icon}</span>
      <span>{label}</span>
      {badge && (
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: badgeColor || 'var(--color-surface-container-high)', color: badgeText || 'var(--color-on-surface-variant)' }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function AnalyticsTab({ stats, disputes }) {
  const resolutionRate = stats.total_cases ? Math.round((stats.resolved_cases / stats.total_cases) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
        <StatCard title="Total Registered Cases" value={stats.total_cases} />
        <StatCard title="Active Mediations" value={stats.active_cases} />
        <StatCard title="Overall Resolution Rate" value={`${resolutionRate}%`} />
        <StatCard title="Registered Citizens" value={stats.users_count} />
        {/* §5.1: Escalated cases always shown prominently in admin view */}
        {(stats.escalated_awaiting_reference ?? stats.escalated_cases) > 0 && (
          <StatCard
            title="⚠ Escalated — Awaiting Referral"
            value={stats.escalated_awaiting_reference ?? stats.escalated_cases}
            danger
          />
        )}
      </div>
      <div className="card" style={{ padding: 'var(--space-lg)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 'var(--text-label-md-size)', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Case Activity Stream</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {disputes.slice(0,5).map(d => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-surface-container)', borderRadius: 8 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{d.case_number}</span>
                <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginLeft: 8 }}>{d.title}</span>
              </div>
              <span className="badge badge--neutral" style={{ fontSize: 10 }}>{d.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, danger }) {
  return (
    <div className="card" style={{ padding: 'var(--space-lg)', borderLeft: danger ? '4px solid var(--status-escalated-border)' : undefined }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: danger ? 'var(--status-escalated-text)' : 'var(--color-on-surface-variant)', fontWeight: 600 }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 600, color: danger ? 'var(--status-escalated-border)' : 'var(--color-primary)', marginTop: 8 }}>{value}</div>
    </div>
  );
}

function UsersTab({ users, setUsers }) {
  const updateKyc = async (id, status) => {
    try {
      await client.put(`/admin/users/${id}/kyc`, { kyc_status: status });
      setUsers(users.map(u => u.id === id ? { ...u, kyc_status: status } : u));
    } catch (e) {
      alert('Failed to update KYC status');
    }
  };

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table style={s.table}>
        <thead style={s.thead}>
          <tr>
            <th style={s.th}>User ID & Name</th>
            <th style={s.th}>Role</th>
            <th style={s.th}>Email</th>
            <th style={s.th}>KYC Status</th>
            <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={s.tr}>
              <td style={s.td}>
                <div style={{ fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>ID: {u.id}</div>
              </td>
              <td style={s.td}><span style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
              <td style={s.td}>{u.email}</td>
              <td style={s.td}>
                <span className={`badge ${u.kyc_status === 'verified' ? 'badge--resolved' : u.kyc_status === 'pending' ? 'badge--in-progress' : 'badge--neutral'}`}>
                  {u.kyc_status}
                </span>
              </td>
              <td style={{ ...s.td, textAlign: 'right' }}>
                {u.kyc_status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--color-secondary)' }} onClick={() => updateKyc(u.id, 'verified')}>Verify</button>
                    <button className="btn btn-sm btn-destructive" onClick={() => updateKyc(u.id, 'rejected')}>Reject</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CasesTab({ disputes, setDisputes }) {
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table style={s.table}>
        <thead style={s.thead}>
          <tr>
            <th style={s.th}>Case Number</th>
            <th style={s.th}>Title</th>
            <th style={s.th}>Status</th>
            <th style={s.th}>Assigned Mediator</th>
            <th style={s.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {disputes.map(d => (
            <tr key={d.id} style={s.tr}>
              <td style={{ ...s.td, fontWeight: 600, color: 'var(--color-primary)' }}>{d.case_number}</td>
              <td style={s.td}>{d.title}</td>
              <td style={s.td}><span className="badge badge--neutral">{d.status}</span></td>
              <td style={s.td}>
                {d.mediator_id ? <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>{d.mediator_name || 'Assigned'}</span> : <span style={{ color: 'var(--color-on-surface-variant)' }}>Unassigned</span>}
              </td>
              <td style={s.td}>
                <a href={`/cases/${d.id}`} className="btn btn-sm btn-outline">Manage Case</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgreementsTab({ agreements, setAgreements }) {
  const [form, setForm] = useState({ landlord_id: '', tenant_id: '', property_address: '', start_date: '', end_date: '', monthly_rent: '' });
  
  const create = async (e) => {
    e.preventDefault();
    try {
      await client.post('/admin/rental-agreements', form);
      const res = await client.get('/admin/rental-agreements');
      setAgreements(res.data);
      setForm({ landlord_id: '', tenant_id: '', property_address: '', start_date: '', end_date: '', monthly_rent: '' });
    } catch (err) {
      alert('Error creating agreement');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className="card" style={{ padding: 'var(--space-lg)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--color-primary)' }}>Register New Agreement</h3>
        <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div><label style={s.label}>Landlord ID</label><input required className="input" value={form.landlord_id} onChange={e=>setForm({...form, landlord_id: e.target.value})} /></div>
          <div><label style={s.label}>Tenant ID</label><input required className="input" value={form.tenant_id} onChange={e=>setForm({...form, tenant_id: e.target.value})} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={s.label}>Property Address</label><input required className="input" value={form.property_address} onChange={e=>setForm({...form, property_address: e.target.value})} /></div>
          <div><label style={s.label}>Start Date</label><input required type="date" className="input" value={form.start_date} onChange={e=>setForm({...form, start_date: e.target.value})} /></div>
          <div><label style={s.label}>End Date</label><input type="date" className="input" value={form.end_date} onChange={e=>setForm({...form, end_date: e.target.value})} /></div>
          <div><label style={s.label}>Monthly Rent ($)</label><input required type="number" step="0.01" className="input" value={form.monthly_rent} onChange={e=>setForm({...form, monthly_rent: e.target.value})} /></div>
          <div style={{ gridColumn: '1 / -1', marginTop: 8 }}><button className="btn btn-primary" type="submit">Create Agreement</button></div>
        </form>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead style={s.thead}>
            <tr>
              <th style={s.th}>Property</th>
              <th style={s.th}>Landlord / Tenant (IDs)</th>
              <th style={s.th}>Term</th>
              <th style={s.th}>Rent</th>
              <th style={s.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {agreements.map(a => (
              <tr key={a.id} style={s.tr}>
                <td style={{ ...s.td, fontWeight: 500 }}>{a.property_address}</td>
                <td style={s.td}>{a.landlord_id} / {a.tenant_id}</td>
                <td style={s.td}>{new Date(a.start_date).toLocaleDateString()} — {a.end_date ? new Date(a.end_date).toLocaleDateString() : 'Active'}</td>
                <td style={s.td}>${a.monthly_rent}</td>
                <td style={s.td}><span className="badge badge--neutral">{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s = {
  page: { maxWidth: 1280, margin: '0 auto', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)', marginBottom: 8 },
  title: { fontFamily: 'var(--font-serif)', fontSize: 'var(--text-headline-lg-size)', color: 'var(--color-primary)', letterSpacing: '-0.015em', margin: '0 0 4px 0' },
  subtitle: { fontSize: 'var(--text-body-md-size)', color: 'var(--color-on-surface-variant)', margin: 0, maxWidth: 600 },

  tabBar: { display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-surface-container-low)', padding: 6, borderRadius: 8, overflowX: 'auto' },
  tabBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--text-label-sm-size)', fontWeight: 500, color: 'var(--color-on-surface-variant)', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  tabBtnActive: { background: 'var(--color-surface-container-lowest)', color: 'var(--color-primary)', fontWeight: 600, boxShadow: 'var(--shadow-sm)' },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-sm-size)' },
  thead: { background: 'var(--color-surface-container-lowest)', borderBottom: '1px solid var(--color-outline-variant)' },
  th: { padding: '12px var(--space-md)', fontSize: '11px', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' },
  tr: { borderBottom: '1px solid var(--color-surface-container)' },
  td: { padding: '12px var(--space-md)' },
  
  label: { display: 'block', fontSize: 'var(--text-label-sm-size)', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: 4 }
};
