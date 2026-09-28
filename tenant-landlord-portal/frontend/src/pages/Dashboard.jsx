import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge, { statusColor } from '../components/StatusBadge.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/disputes').then(({ data }) => {
      setDisputes(data.disputes);
      setLoading(false);
    });
  }, []);

  const counts = disputes.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  const activeCount = disputes.filter((d) => !['Resolved', 'Closed'].includes(d.status)).length;

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-serif text-2xl text-ink">Welcome, {user.name.split(' ')[0]}</h1>
        <p className="text-sm text-ink-light mt-1">
          Here is an overview of your dispute cases on the portal.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <SummaryCard label="Total cases" value={disputes.length} />
        <SummaryCard label="Active cases" value={activeCount} />
        <SummaryCard label="Resolved" value={counts.Resolved || 0} accent="success" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg text-ink">Recent cases</h2>
        <div className="flex gap-3">
          {(user.role === 'tenant' || user.role === 'landlord') && (
            <Link
              to="/file-dispute"
              className="text-sm bg-ink text-paper px-4 py-2 rounded-sm hover:bg-ink-light transition-colors"
            >
              File a dispute
            </Link>
          )}
          <Link to="/cases" className="text-sm text-accent hover:text-accent-dark font-medium self-center">
            View all →
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-light">Loading cases…</p>
      ) : disputes.length === 0 ? (
        <div className="border border-line rounded-sm bg-panel p-8 text-center">
          <p className="text-ink-light text-sm">
            No cases yet. {user.role === 'tenant' || user.role === 'landlord'
              ? 'File a dispute to get started.'
              : 'Cases will appear here once assigned.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {disputes.slice(0, 5).map((d) => (
            <Link
              key={d.id}
              to={`/cases/${d.id}`}
              className="status-stripe flex items-center justify-between bg-panel border border-line rounded-sm px-4 py-3.5 hover:border-ink-light transition-colors"
              style={{ borderLeftColor: statusColor(d.status) }}
            >
              <div>
                <p className="text-sm font-medium text-ink">{d.case_number}</p>
                <p className="text-xs text-ink-light mt-0.5">{d.category}</p>
              </div>
              <StatusBadge status={d.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="border border-line rounded-sm bg-panel px-5 py-4">
      <p className="text-xs text-ink-light">{label}</p>
      <p className={`font-serif text-3xl mt-1 ${accent === 'success' ? 'text-success' : 'text-ink'}`}>
        {value}
      </p>
    </div>
  );
}
