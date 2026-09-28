import React, { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge.jsx';

const ROLES = ['tenant', 'landlord', 'mediator', 'admin'];

export default function AdminPanel() {
  const [tab, setTab] = useState('analytics');

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-2xl text-ink">Admin panel</h1>
        <p className="text-sm text-ink-light mt-1">Manage users, assign mediators, and monitor portal activity.</p>
      </header>

      <div className="flex gap-2 mb-6">
        {[
          ['analytics', 'Analytics'],
          ['users', 'Users'],
          ['disputes', 'All cases']
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`text-sm px-4 py-2 rounded-sm border transition-colors ${
              tab === key ? 'bg-ink text-paper border-ink' : 'border-line text-ink-light hover:border-ink-light'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'disputes' && <DisputesTab />}
    </div>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get('/admin/analytics').then(({ data }) => setData(data.analytics));
  }, []);

  if (!data) return <p className="text-sm text-ink-light">Loading analytics…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Metric label="Total cases" value={data.totalCases} />
        <Metric label="Resolution rate" value={`${data.resolutionRate}%`} accent="success" />
        <Metric label="Escalation rate" value={`${data.escalationRate}%`} accent="danger" />
        <Metric
          label="Avg. resolution time"
          value={data.averageResolutionDays !== null ? `${data.averageResolutionDays}d` : '—'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-line rounded-sm bg-panel p-5">
          <h3 className="font-serif text-base text-ink mb-3">Cases by status</h3>
          <BarList items={data.byStatus.map((s) => ({ label: s.status, count: s.count }))} />
        </div>
        <div className="border border-line rounded-sm bg-panel p-5">
          <h3 className="font-serif text-base text-ink mb-3">Cases by category</h3>
          <BarList items={data.byCategory.map((c) => ({ label: c.category, count: c.count }))} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }) {
  const color = accent === 'success' ? 'text-success' : accent === 'danger' ? 'text-danger' : 'text-ink';
  return (
    <div className="border border-line rounded-sm bg-panel px-5 py-4">
      <p className="text-xs text-ink-light">{label}</p>
      <p className={`font-serif text-2xl mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function BarList({ items }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-2.5">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex justify-between text-xs text-ink-light mb-1">
            <span>{i.label}</span>
            <span>{i.count}</span>
          </div>
          <div className="h-1.5 bg-line rounded-sm overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${(i.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    client.get('/admin/users').then(({ data }) => {
      setUsers(data.users);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (id, role) => {
    await client.patch(`/admin/users/${id}/role`, { role });
    load();
  };

  const toggleKyc = async (id, verified) => {
    await client.patch(`/admin/users/${id}/kyc`, { verified });
    load();
  };

  if (loading) return <p className="text-sm text-ink-light">Loading users…</p>;

  return (
    <div className="border border-line rounded-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-panel border-b border-line text-left text-xs text-ink-light">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">KYC</th>
            <th className="px-4 py-3 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-line last:border-0 bg-panel">
              <td className="px-4 py-3 text-ink font-medium">{u.name}</td>
              <td className="px-4 py-3 text-ink-light">{u.email}</td>
              <td className="px-4 py-3">
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  className="border border-line rounded-sm px-2 py-1 text-xs bg-paper capitalize"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => toggleKyc(u.id, !u.kyc_verified)}
                  className={`text-xs px-2.5 py-1 rounded-sm border ${
                    u.kyc_verified
                      ? 'bg-[#E6EFE9] text-success border-success/40'
                      : 'bg-[#EFEDE6] text-ink-light border-line'
                  }`}
                >
                  {u.kyc_verified ? 'Verified' : 'Unverified'}
                </button>
              </td>
              <td className="px-4 py-3 text-ink-light text-xs">
                {new Date(u.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DisputesTab() {
  const [disputes, setDisputes] = useState([]);
  const [mediators, setMediators] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([client.get('/admin/disputes'), client.get('/admin/mediators')]).then(
      ([{ data: d }, { data: m }]) => {
        setDisputes(d.disputes);
        setMediators(m.mediators);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => { load(); }, [load]);

  const assignMediator = async (disputeId, mediatorId) => {
    if (!mediatorId) return;
    await client.post(`/mediation/${disputeId}/assign`, { mediatorId });
    load();
  };

  if (loading) return <p className="text-sm text-ink-light">Loading cases…</p>;

  return (
    <div className="border border-line rounded-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-panel border-b border-line text-left text-xs text-ink-light">
            <th className="px-4 py-3 font-medium">Case</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Mediator</th>
          </tr>
        </thead>
        <tbody>
          {disputes.map((d) => (
            <tr key={d.id} className="border-b border-line last:border-0 bg-panel">
              <td className="px-4 py-3 text-ink font-medium">{d.case_number}</td>
              <td className="px-4 py-3 text-ink-light">{d.category}</td>
              <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
              <td className="px-4 py-3">
                <select
                  defaultValue={d.mediator_id || ''}
                  onChange={(e) => assignMediator(d.id, e.target.value)}
                  className="border border-line rounded-sm px-2 py-1 text-xs bg-paper"
                >
                  <option value="">Unassigned</option>
                  {mediators.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
