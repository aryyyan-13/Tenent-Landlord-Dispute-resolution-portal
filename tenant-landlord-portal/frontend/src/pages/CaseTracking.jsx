import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import StatusBadge, { statusColor } from '../components/StatusBadge.jsx';

const STATUSES = ['Filed', 'Under Review', 'Mediation', 'Resolved', 'Escalated', 'Closed'];

export default function CaseTracking() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    client.get('/disputes').then(({ data }) => {
      setDisputes(data.disputes);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(
    () => (statusFilter === 'All' ? disputes : disputes.filter((d) => d.status === statusFilter)),
    [disputes, statusFilter]
  );

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-2xl text-ink">Case tracking</h1>
        <p className="text-sm text-ink-light mt-1">Follow the progress of every case you are party to.</p>
      </header>

      <div className="flex gap-2 mb-5 flex-wrap">
        {['All', ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-sm border transition-colors ${
              statusFilter === s
                ? 'bg-ink text-paper border-ink'
                : 'border-line text-ink-light hover:border-ink-light'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink-light">Loading cases…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-line rounded-sm bg-panel p-8 text-center">
          <p className="text-ink-light text-sm">No cases match this filter.</p>
        </div>
      ) : (
        <div className="border border-line rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-panel border-b border-line text-left text-xs text-ink-light">
                <th className="px-4 py-3 font-medium">Case</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Filed by</th>
                <th className="px-4 py-3 font-medium">Opposing party</th>
                <th className="px-4 py-3 font-medium">Mediator</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-line last:border-0 bg-panel hover:bg-paper transition-colors status-stripe"
                  style={{ borderLeftColor: statusColor(d.status), borderLeftWidth: 4 }}
                >
                  <td className="px-4 py-3">
                    <Link to={`/cases/${d.id}`} className="text-accent hover:text-accent-dark font-medium">
                      {d.case_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-light">{d.category}</td>
                  <td className="px-4 py-3 text-ink-light">{d.filed_by?.name}</td>
                  <td className="px-4 py-3 text-ink-light">{d.opposing_party?.name}</td>
                  <td className="px-4 py-3 text-ink-light">{d.mediator?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
