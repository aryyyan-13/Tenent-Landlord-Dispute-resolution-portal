import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const STATUSES = ['Filed', 'Under Review', 'Mediation', 'Resolved', 'Escalated', 'Closed'];

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [dispute, setDispute] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await client.get(`/disputes/${id}`);
    setDispute(data.dispute);
    setTimeline(data.timeline);
    setDocuments(data.documents);

    const [{ data: msgData }, { data: sessionData }] = await Promise.all([
      client.get(`/disputes/${id}/messages`),
      client.get(`/mediation/${id}/sessions`)
    ]);
    setMessages(msgData.messages);
    setSessions(sessionData.sessions);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load().catch((err) => {
      setError(err.response?.data?.error || 'Failed to load case.');
      setLoading(false);
    });
  }, [load]);

  if (loading) return <p className="text-sm text-ink-light">Loading case…</p>;
  if (error) return <ErrorBox message={error} />;
  if (!dispute) return null;

  return (
    <div>
      <Link to="/cases" className="text-sm text-accent hover:text-accent-dark">← Back to cases</Link>

      <header className="flex items-start justify-between mt-3 mb-6">
        <div>
          <h1 className="font-serif text-2xl text-ink">{dispute.case_number}</h1>
          <p className="text-sm text-ink-light mt-1">{dispute.category}</p>
        </div>
        <StatusBadge status={dispute.status} />
      </header>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Section title="Description">
            <p className="text-sm text-ink-light leading-relaxed whitespace-pre-wrap">{dispute.description}</p>
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <PartyBlock label="Filed by" person={dispute.filed_by} />
              <PartyBlock label="Opposing party" person={dispute.opposing_party} />
            </div>
          </Section>

          <Section title="Documents">
            {documents.length === 0 ? (
              <p className="text-sm text-ink-light">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between text-sm border border-line rounded-sm px-3 py-2">
                    <div>
                      <a href={doc.file_path} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-dark">
                        {doc.file_name}
                      </a>
                      <span className="text-xs text-ink-light ml-2">{doc.label}</span>
                    </div>
                    <span className="text-xs text-ink-light">by {doc.uploaded_by_name}</span>
                  </li>
                ))}
              </ul>
            )}
            <UploadDocuments disputeId={id} onUploaded={load} />
          </Section>

          <MediationPanel
            dispute={dispute}
            sessions={sessions}
            user={user}
            onUpdate={load}
          />

          <Section title="Communication">
            <MessageThread messages={messages} disputeId={id} onSent={load} currentUserId={user.id} />
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Mediator">
            <p className="text-sm text-ink-light">{dispute.mediator?.name || 'Not yet assigned'}</p>
          </Section>

          {(user.role === 'mediator' || user.role === 'admin') && (
            <Section title="Update case status">
              <StatusUpdater disputeId={id} currentStatus={dispute.status} onUpdate={load} />
            </Section>
          )}

          <Section title="Case timeline">
            <ol className="space-y-3">
              {timeline.map((t) => (
                <li key={t.id} className="text-sm border-l-2 border-line pl-3">
                  <p className="font-medium text-ink">{t.status}</p>
                  {t.note && <p className="text-ink-light text-xs mt-0.5">{t.note}</p>}
                  <p className="text-ink-light text-xs mt-0.5">
                    {new Date(t.created_at).toLocaleString()}
                    {t.actor_name ? ` · ${t.actor_name}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-panel border border-line rounded-sm p-5">
      <h2 className="font-serif text-base text-ink mb-3">{title}</h2>
      {children}
    </div>
  );
}

function PartyBlock({ label, person }) {
  return (
    <div>
      <p className="text-xs text-ink-light">{label}</p>
      <p className="text-ink font-medium">{person?.name}</p>
      <p className="text-xs text-ink-light capitalize">{person?.role}</p>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="border border-danger/30 bg-[#F3E2E2] text-danger rounded-sm p-4 text-sm">{message}</div>
  );
}

function UploadDocuments({ disputeId, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const handleUpload = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      const data = new FormData();
      Array.from(files).forEach((f) => data.append('files', f));
      await client.post(`/disputes/${disputeId}/documents`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFiles([]);
      onUploaded();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex items-center gap-3">
      <input
        type="file"
        multiple
        onChange={(e) => setFiles(e.target.files)}
        className="text-xs text-ink-light file:mr-3 file:py-1 file:px-2.5 file:rounded-sm file:border file:border-line file:bg-paper file:text-ink file:text-xs"
      />
      <button
        onClick={handleUpload}
        disabled={busy || !files.length}
        className="text-xs bg-ink text-paper px-3 py-1.5 rounded-sm disabled:opacity-50"
      >
        {busy ? 'Uploading…' : 'Upload'}
      </button>
    </div>
  );
}

function StatusUpdater({ disputeId, currentStatus, onUpdate }) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const handleUpdate = async () => {
    setBusy(true);
    try {
      await client.patch(`/disputes/${disputeId}/status`, { status, note });
      setNote('');
      onUpdate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full border border-line rounded-sm px-2.5 py-1.5 text-sm bg-paper"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="w-full border border-line rounded-sm px-2.5 py-1.5 text-sm bg-paper"
      />
      <button
        onClick={handleUpdate}
        disabled={busy}
        className="w-full text-sm bg-ink text-paper py-1.5 rounded-sm disabled:opacity-50"
      >
        {busy ? 'Updating…' : 'Update status'}
      </button>
    </div>
  );
}

function MessageThread({ messages, disputeId, onSent, currentUserId }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await client.post(`/disputes/${disputeId}/messages`, { body });
      setBody('');
      onSent();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="space-y-3 max-h-72 overflow-y-auto mb-4 pr-1">
        {messages.length === 0 && <p className="text-sm text-ink-light">No messages yet.</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm rounded-sm px-3 py-2 max-w-[80%] ${
              m.sender_id === currentUserId ? 'bg-ink text-paper ml-auto' : 'bg-paper border border-line'
            }`}
          >
            <p>{m.body}</p>
            <p className={`text-[11px] mt-1 ${m.sender_id === currentUserId ? 'text-paper/70' : 'text-ink-light'}`}>
              {m.sender_name} · {new Date(m.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 border border-line rounded-sm px-3 py-2 text-sm bg-paper focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy}
          className="text-sm bg-ink text-paper px-4 py-2 rounded-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MediationPanel({ dispute, sessions, user, onUpdate }) {
  const isMediator = user.role === 'mediator' && dispute.mediator?.id === user.id;
  const isAdmin = user.role === 'admin';
  const isParty = user.role === 'tenant' || user.role === 'landlord';

  const [sessionDate, setSessionDate] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [proposedResolution, setProposedResolution] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await client.post(`/mediation/${dispute.id}/sessions`, {
        sessionDate,
        sessionNotes,
        proposedResolution
      });
      setSessionDate('');
      setSessionNotes('');
      setProposedResolution('');
      onUpdate();
    } finally {
      setBusy(false);
    }
  };

  const handleDecision = async (sessionId, decision) => {
    await client.post(`/mediation/sessions/${sessionId}/decision`, { decision });
    onUpdate();
  };

  return (
    <Section title="Mediation">
      {sessions.length === 0 && !isMediator && !isAdmin && (
        <p className="text-sm text-ink-light">No mediation session has been scheduled yet.</p>
      )}

      <div className="space-y-4">
        {sessions.map((s) => (
          <div key={s.id} className="border border-line rounded-sm p-4 text-sm">
            <p className="text-xs text-ink-light mb-1">
              Session {s.session_date ? `on ${s.session_date}` : ''} · Mediator: {s.mediator_name}
            </p>
            {s.session_notes && (
              <p className="mb-2"><span className="text-ink-light">Notes: </span>{s.session_notes}</p>
            )}
            {s.proposed_resolution && (
              <p className="mb-2"><span className="text-ink-light">Proposed resolution: </span>{s.proposed_resolution}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-ink-light mt-2">
              <span>Tenant decision: <strong className="text-ink">{s.tenant_decision}</strong></span>
              <span>Landlord decision: <strong className="text-ink">{s.landlord_decision}</strong></span>
            </div>
            {s.final_decision && (
              <p className="mt-2 text-xs font-medium">
                Final outcome: <span className="text-ink">{s.final_decision}</span>
              </p>
            )}

            {isParty && !s.final_decision && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleDecision(s.id, 'Accepted')}
                  className="text-xs bg-success text-paper px-3 py-1.5 rounded-sm"
                >
                  Accept proposal
                </button>
                <button
                  onClick={() => handleDecision(s.id, 'Rejected')}
                  className="text-xs bg-danger text-paper px-3 py-1.5 rounded-sm"
                >
                  Reject proposal
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {(isMediator || isAdmin) && (
        <form onSubmit={handleCreateSession} className="mt-4 border-t border-line pt-4 space-y-2">
          <p className="text-sm font-medium text-ink mb-1">Schedule / update mediation session</p>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="w-full border border-line rounded-sm px-2.5 py-1.5 text-sm bg-paper"
          />
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Session notes"
            rows={3}
            className="w-full border border-line rounded-sm px-2.5 py-1.5 text-sm bg-paper resize-none"
          />
          <textarea
            value={proposedResolution}
            onChange={(e) => setProposedResolution(e.target.value)}
            placeholder="Proposed resolution"
            rows={2}
            className="w-full border border-line rounded-sm px-2.5 py-1.5 text-sm bg-paper resize-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="text-sm bg-ink text-paper px-4 py-2 rounded-sm disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save session'}
          </button>
        </form>
      )}
    </Section>
  );
}
