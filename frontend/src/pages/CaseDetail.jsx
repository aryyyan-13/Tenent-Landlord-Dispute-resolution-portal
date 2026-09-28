import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

// Maps DB case_status to display config
const STATUS_CONFIG = {
  open_negotiation:                 { label: 'Under Review',          cls: 'badge--review',       stripe: 'card-stripe--review' },
  open_mediation:                   { label: 'In Mediation',          cls: 'badge--in-progress',  stripe: 'card-stripe--in-progress' },
  resolved_settlement_negotiation:  { label: 'Resolved (Settlement)', cls: 'badge--resolved',     stripe: 'card-stripe--resolved' },
  resolved_settlement_mediation:    { label: 'Resolved (Mediated)',   cls: 'badge--resolved',     stripe: 'card-stripe--resolved' },
  mediation_failed:                 { label: 'Escalated',             cls: 'badge--escalated',    stripe: 'card-stripe--escalated-prominent' },
  closed_referred_rent_authority:   { label: 'Referred to Authority', cls: 'badge--escalated',    stripe: 'card-stripe--escalated-prominent' },
  closed_withdrawn:                 { label: 'Withdrawn',             cls: 'badge--neutral',      stripe: '' },
  closed_no_response:               { label: 'Closed (No Response)',  cls: 'badge--neutral',      stripe: '' },
};

const ESCALATED_REASON_LABELS = {
  party_rejected_proposal:           'One or both parties rejected the proposed resolution.',
  manually_escalated_by_mediator:    'The assigned mediator manually escalated this case.',
  manually_escalated_by_admin:       'An administrator manually escalated this case.',
};

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const BACKENDURL = rawApiUrl.replace(/\/api$/, '');

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [proposalJsonText, setProposalJsonText] = useState('{\n  "obligations": [\n    {\n      "party": "tenant",\n      "action": "Pay rent arrears",\n      "amount": 500,\n      "due_date": "2026-10-15"\n    }\n  ],\n  "additional_terms": "Tenant must provide receipt"\n}');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      client.get(`/disputes/${id}`),
      client.get(`/mediation/${id}/sessions`).catch(() => ({ data: { sessions: [] } })),
      client.get(`/disputes/${id}/messages`).catch(() => ({ data: { messages: [] } })),
    ]).then(([dr, sr, mr]) => {
      setData(dr.data);
      setSessions(sr.data.sessions || []);
      setMessages(mr.data.messages || []);
    }).catch(() => navigate('/cases')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <Layout>
      <div style={{ padding: 40, textAlign: 'center' }}>
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 32, color: 'var(--color-outline)' }}>progress_activity</span>
      </div>
    </Layout>
  );
  if (!data) return null;

  const { dispute, timeline = [], documents = [] } = data;
  const st = STATUS_CONFIG[dispute.case_status] || STATUS_CONFIG['open_negotiation'];

  const isEscalated = ['mediation_failed', 'closed_referred_rent_authority'].includes(dispute.case_status);
  const isResolved  = ['resolved_settlement_mediation', 'resolved_settlement_negotiation'].includes(dispute.case_status);
  const isParty     = dispute.filed_by_id === user?.id || dispute.opposing_party_id === user?.id;
  const isMediatorOnCase = dispute.mediator_id === user?.id;
  const canEscalate = user?.role === 'admin' || isMediatorOnCase;
  const canDecide   = isParty && (user?.role === 'tenant' || user?.role === 'landlord') && dispute.case_status === 'open_mediation';

  const latestSession = sessions[0] || null;

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSendingMsg(true);
    try {
      await client.post(`/disputes/${id}/messages`, { body: newMsg.trim() });
      setNewMsg('');
      const mr = await client.get(`/disputes/${id}/messages`);
      setMessages(mr.data.messages || []);
    } catch { /* noop */ } finally { setSendingMsg(false); }
  };

  const submitDecision = async (decision) => {
    if (!latestSession) return;
    setDecisionLoading(true);
    try {
      const res = await client.post(`/mediation/sessions/${latestSession.id}/decision`, {
        party: user.role,
        decision,
      });
      setActionResult(res.data);
      fetchAll();
    } catch (err) {
      setActionResult({ error: err.response?.data?.error || 'Decision failed.' });
    } finally { setDecisionLoading(false); }
  };

  const submitEscalate = async () => {
    if (!escalateReason.trim()) return;
    setEscalating(true);
    try {
      const res = await client.post(`/mediation/${id}/escalate`, { reason: escalateReason });
      setActionResult(res.data);
      setEscalateReason('');
      fetchAll();
    } catch (err) {
      setActionResult({ error: err.response?.data?.error || 'Escalation failed.' });
    } finally { setEscalating(false); }
  };

  const submitPropose = async () => {
    setProposing(true);
    try {
      const parsedJson = JSON.parse(proposalJsonText);
      const res = await client.post(`/mediation/${id}/sessions`, { 
        sessionDate: new Date().toISOString(),
        sessionNotes: 'Mediator proposed a resolution for parties to review.',
        proposedResolutionJson: parsedJson
      });
      setActionResult({ outcome: 'Resolution proposed successfully. Parties can now review it.' });
      fetchAll();
    } catch (err) {
      setActionResult({ error: err.response?.data?.error || err.message || 'Failed to parse JSON or propose resolution.' });
    } finally { setProposing(false); }
  };


  return (
    <Layout>
      <div style={s.page}>

        {/* ── Case header card ── */}
        <div className={`card ${st.stripe}`} style={{ padding: 'var(--space-lg)' }}>
          <div style={s.headTop}>
            <div style={s.breadcrumb}>
              <button onClick={() => navigate('/cases')} style={s.backBtn}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>folder_shared</span> Case Tracking
              </button>
              <span style={{ color: 'var(--color-outline-variant)' }}>/</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                Docket #{dispute.case_number}
                {isEscalated && <span className="tag-escalated"><span className="material-symbols-outlined" style={{ fontSize: 10 }}>warning</span> Escalated</span>}
              </span>
            </div>
            <span className={`badge ${st.cls}`}>{st.label}</span>
          </div>

          <div style={s.headMain}>
            <div>
              <h1 style={s.title}>Case #{dispute.case_number}</h1>
              <div style={s.metaList}>
                <span style={s.metaItem}>
                  <span className="material-symbols-outlined" style={s.metaIcon}>calendar_today</span>
                  Filed: {new Date(dispute.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span style={{ color: 'var(--color-outline-variant)' }}>•</span>
                <span style={s.metaItem}>
                  <span className="material-symbols-outlined" style={s.metaIcon}>location_city</span>
                  {dispute.property_address || 'Unspecified'}
                </span>
                <span style={{ color: 'var(--color-outline-variant)' }}>•</span>
                <span style={s.metaItem}>
                  <span className="material-symbols-outlined" style={s.metaIcon}>category</span>
                  {dispute.category?.replace(/_/g, ' ') || 'General'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {canEscalate && !isEscalated && !isResolved && (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => setActionResult('propose-panel')}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_document</span> Propose Resolution
                  </button>
                  <button className="btn btn-destructive btn-sm" onClick={() => setActionResult('escalate-panel')}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>gavel</span> Escalate Now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Escalation / Resolution banner (§5.2) — immediately below header ── */}
        {isEscalated && (
          <div className="escalation-banner" role="alert">
            <span className="material-symbols-outlined" style={{ fontSize: 28, flexShrink: 0 }}>warning</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                Mediation unsuccessful — case escalated
              </div>
              <div style={{ fontSize: '0.875rem', marginBottom: 12 }}>
                {ESCALATED_REASON_LABELS[dispute.escalated_reason] || 'This case has been escalated for external resolution.'}
                {dispute.escalated_at && (
                  <span style={{ marginLeft: 8, opacity: 0.75 }}>
                    ({new Date(dispute.escalated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})
                  </span>
                )}
              </div>
              {/* Find case bundle from documents or from the latest case bundle URL if stored */}
              <a
                href={`${BACKENDURL}/api/disputes/${id}`}
                onClick={async (e) => {
                  e.preventDefault();
                  // Trigger a fresh case detail fetch to get bundle URL from documents
                  try {
                    const docs = documents.filter(d => d.doc_type === 'rent_authority_bundle' || d.file_path?.includes('/bundles/'));
                    if (docs[0]) window.open(BACKENDURL + docs[0].file_path, '_blank');
                    else alert('Bundle is being generated. Please refresh in a moment.');
                  } catch { /* noop */ }
                }}
                className="btn btn-sm"
                style={{ background: 'var(--status-escalated-border)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                Download case bundle
              </a>
            </div>
          </div>
        )}

        {isResolved && (
          <div className="escalation-banner escalation-banner--resolved" role="status">
            <span className="material-symbols-outlined" style={{ fontSize: 28, flexShrink: 0 }}>task_alt</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                Mediation successful — settlement reached
              </div>
              <div style={{ fontSize: '0.875rem', marginBottom: 12 }}>
                Both parties accepted the proposed resolution. A binding settlement agreement has been generated.
              </div>
              {dispute.settlement_agreement?.generated_pdf_path && (
                <a
                  href={BACKENDURL + dispute.settlement_agreement.generated_pdf_path}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                  style={{ background: 'var(--status-resolved-border)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                  Download settlement agreement (PDF)
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── Escalation panel (mediator/admin) ── */}
        {actionResult === 'escalate-panel' && (
          <div className="card" style={{ padding: 'var(--space-lg)', border: '1px solid var(--color-error)', borderLeft: '6px solid var(--color-error)' }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined">warning</span> Manual Escalation
            </h3>
            <p style={{ fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', margin: '0 0 12px 0' }}>
              This action transitions the case to <strong>mediation_failed</strong> and generates a case bundle for Rent Authority referral. Use only when normal mediation is not progressing.
            </p>
            <textarea
              className="input"
              placeholder="Reason for escalation (e.g. party unreachable for 3 sessions)…"
              value={escalateReason}
              onChange={e => setEscalateReason(e.target.value)}
              style={{ height: 80, marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-destructive"
                onClick={submitEscalate}
                disabled={!escalateReason.trim() || escalating}
              >
                {escalating ? 'Escalating…' : 'Confirm escalation'}
              </button>
              <button className="btn btn-outline" onClick={() => setActionResult(null)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Propose Resolution panel (mediator) ── */}
        {actionResult === 'propose-panel' && (
          <div className="card" style={{ padding: 'var(--space-lg)', border: '1px solid var(--color-primary)', borderLeft: '6px solid var(--color-primary)' }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined">edit_document</span> Propose Binding Resolution
            </h3>
            <p style={{ fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', margin: '0 0 12px 0' }}>
              Draft a formal resolution JSON. Once submitted, both parties will be prompted to Accept or Reject it. If both accept, a binding PDF settlement is generated and the case is closed.
            </p>
            <textarea
              className="input"
              value={proposalJsonText}
              onChange={e => setProposalJsonText(e.target.value)}
              style={{ height: 180, marginBottom: 12, fontFamily: 'monospace', fontSize: 13 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={submitPropose}
                disabled={!proposalJsonText.trim() || proposing}
              >
                {proposing ? 'Submitting…' : 'Submit Proposal'}
              </button>
              <button className="btn btn-outline" onClick={() => setActionResult(null)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Action result notification ── */}
        {actionResult && actionResult !== 'escalate-panel' && actionResult !== 'propose-panel' && (
          <div className={`card`} style={{ padding: 'var(--space-md)', borderLeft: `4px solid ${actionResult.error ? 'var(--color-error)' : 'var(--status-resolved-border)'}`, background: actionResult.error ? 'var(--color-error-container)' : 'var(--status-resolved-bg)' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{actionResult.error ? 'Error' : `Outcome: ${actionResult.outcome}`}</div>
            <div style={{ fontSize: 'var(--text-body-sm-size)' }}>
              {actionResult.error || (
                actionResult.settlementPdfUrl
                  ? <a href={BACKENDURL + actionResult.settlementPdfUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--status-resolved-text)' }}>Download settlement PDF</a>
                  : actionResult.caseBundleUrl
                  ? <a href={BACKENDURL + actionResult.caseBundleUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--status-escalated-text)' }}>Download case bundle</a>
                  : (actionResult.message || JSON.stringify(actionResult.session || {}))
              )}
            </div>
            <button onClick={() => setActionResult(null)} style={{ marginTop: 8, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}>Dismiss</button>
          </div>
        )}

        {/* ── Main layout grid ── */}
        <div style={s.grid}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>

            {/* Description */}
            <div>
              <h2 style={s.sectionTitle}>Dispute description</h2>
              <div className="card" style={{ padding: 'var(--space-md)', fontSize: 'var(--text-body-sm-size)', lineHeight: 1.6, color: 'var(--color-on-surface)' }}>
                {dispute.description || 'No description provided.'}
              </div>
            </div>

            {/* Mediation sessions */}
            {sessions.length > 0 && (
              <div>
                <h2 style={s.sectionTitle}>Mediation sessions</h2>
                {sessions.map(session => (
                  <div key={session.id} className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 'var(--text-label-md-size)' }}>
                        {session.scheduled_at ? new Date(session.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Session'}
                      </div>
                      <span className={`badge ${session.status === 'completed' ? 'badge--resolved' : session.status === 'cancelled' ? 'badge--escalated' : 'badge--in-progress'}`}>
                        {session.status}
                      </span>
                    </div>
                    {session.session_notes && (
                      <div style={{ fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', marginBottom: 8 }}>
                        <strong>Notes:</strong> {session.session_notes}
                      </div>
                    )}
                    {session.proposed_resolution && (
                      <div style={{ background: 'var(--color-surface-container-low)', padding: 12, borderRadius: 'var(--radius)', fontSize: 'var(--text-body-sm-size)', marginBottom: 12, whiteSpace: 'pre-line' }}>
                        <strong style={{ display: 'block', marginBottom: 4 }}>Proposed resolution:</strong>
                        {session.proposed_resolution}
                      </div>
                    )}

                    {/* Accept/Reject controls — only for party on this dispute, status open_mediation */}
                    {canDecide && session.id === latestSession?.id && !isResolved && !isEscalated && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => submitDecision('Accepted')}
                          disabled={decisionLoading}
                          style={{ background: 'var(--status-resolved-border)', color: '#fff' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                          Accept resolution
                        </button>
                        <button
                          className="btn btn-sm btn-destructive"
                          onClick={() => submitDecision('Rejected')}
                          disabled={decisionLoading}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                          Reject resolution
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Timeline */}
            <div>
              <h2 style={s.sectionTitle}>Official case timeline</h2>
              <div style={s.timeline}>
                <div style={s.tlLine} />
                {timeline.length === 0 && (
                  <div style={s.tlEvent}>
                    <div style={s.tlDot} />
                    <div>
                      <div style={s.tlTitle}>Formal grievance filed</div>
                      <div style={s.tlTime}>{new Date(dispute.created_at).toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>
                )}
                {timeline.map((t) => (
                  <div key={t.id} style={s.tlEvent}>
                    <div style={{ ...s.tlDot, background: ['mediation_failed', 'closed_referred_rent_authority'].includes(t.to_status) ? 'var(--status-escalated-border)' : ['resolved_settlement_mediation', 'resolved_settlement_negotiation'].includes(t.to_status) ? 'var(--status-resolved-border)' : 'var(--color-primary-container)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={s.tlTitle}>{STATUS_CONFIG[t.to_status]?.label || t.to_status}</div>
                        <div style={s.tlTime}>{new Date(t.created_at).toLocaleDateString('en-IN')}</div>
                      </div>
                      {t.reason && <div style={s.tlBody}>{t.reason}</div>}
                      {t.actor_name && <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>by {t.actor_name}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence */}
            <div>
              <h2 style={s.sectionTitle}>Evidence & Documentation</h2>
              <div className="card" style={{ padding: 'var(--space-md)' }}>
                {documents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-on-surface-variant)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>folder_open</span>
                    <div style={{ fontSize: 'var(--text-label-sm-size)' }}>No exhibits filed yet.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {documents.map(doc => (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--color-surface-container-low)', borderRadius: 'var(--radius)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-secondary)' }}>description</span>
                        <div style={{ flex: 1, fontSize: 'var(--text-label-sm-size)' }}>
                          <a href={BACKENDURL + doc.file_path} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{doc.file_name}</a>
                          <div style={{ color: 'var(--color-on-surface-variant)' }}>{doc.doc_type} · {doc.uploaded_by_name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div>
              <h2 style={s.sectionTitle}>Case communication thread</h2>
              <div className="card" style={{ padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', marginBottom: 12 }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: '16px 0', fontSize: 'var(--text-label-sm-size)' }}>No messages yet.</div>
                  ) : messages.map(m => (
                    <div key={m.id} style={{ padding: 10, background: m.sender_id === user?.id ? 'var(--color-primary-container)' : 'var(--color-surface-container-low)', borderRadius: 'var(--radius)', maxWidth: '80%', alignSelf: m.sender_id === user?.id ? 'flex-end' : 'flex-start' }}>
                      <div style={{ fontSize: 10, color: m.sender_id === user?.id ? 'var(--color-on-primary-container)' : 'var(--color-on-surface-variant)', marginBottom: 2 }}>{m.sender_name} · {m.sender_role}</div>
                      <div style={{ fontSize: 'var(--text-body-sm-size)', color: m.sender_id === user?.id ? '#fff' : 'var(--color-on-surface)' }}>{m.body}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message…"
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={sendMessage} disabled={sendingMsg || !newMsg.trim()}>Send</button>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

            {/* Parties */}
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <h3 style={s.cardTitle}>Parties involved</h3>
              <PartyRow role="Complainant" user={dispute.filed_by} />
              <div style={{ height: 1, background: 'var(--color-surface-container)', margin: '12px 0' }} />
              <PartyRow role="Respondent" user={dispute.opposing_party} />
            </div>

            {/* Mediator */}
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <h3 style={s.cardTitle}>Assigned mediator</h3>
              {dispute.mediator ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-container)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>
                    {dispute.mediator.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-label-sm-size)' }}>{dispute.mediator.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Mediator</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>pending_actions</span>
                  <span style={{ fontSize: 'var(--text-label-sm-size)' }}>Awaiting assignment</span>
                </div>
              )}
            </div>

            {/* Case status card */}
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <h3 style={s.cardTitle}>Case status</h3>
              <span className={`badge ${st.cls}`}>{st.label}</span>
              {dispute.desired_outcome && (
                <div style={{ marginTop: 12, fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)' }}>
                  <strong>Desired outcome:</strong> {dispute.desired_outcome}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}

function PartyRow({ role, user }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>{role}</div>
        <div style={{ fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface)', fontWeight: 500 }}>{user?.name || 'Unknown'}</div>
      </div>
      <span style={{ fontSize: 11, background: 'var(--color-surface-container)', padding: '2px 6px', borderRadius: 4, color: 'var(--color-on-surface-variant)', textTransform: 'capitalize' }}>
        {user?.role || 'Party'}
      </span>
    </div>
  );
}

const s = {
  page: { maxWidth: 1280, margin: '0 auto', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' },
  headTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-sm)', flexWrap: 'wrap', gap: 8 },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-label-sm-size)' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, color: 'var(--color-on-surface-variant)', fontWeight: 500 },
  headMain: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)', paddingTop: 'var(--space-xs)' },
  title: { fontFamily: 'var(--font-serif)', fontSize: 'var(--text-headline-lg-size)', color: 'var(--color-primary)', letterSpacing: '-0.015em', margin: '0 0 4px 0' },
  metaList: { display: 'flex', alignItems: 'center', gap: 'var(--space-md)', fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', flexWrap: 'wrap' },
  metaItem: { display: 'flex', alignItems: 'center', gap: 4 },
  metaIcon: { fontSize: 16, color: 'var(--color-outline)' },
  grid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-xl)', alignItems: 'start' },
  sectionTitle: { fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-primary)', fontWeight: 600, borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: 8, margin: '0 0 16px 0' },
  cardTitle: { fontSize: 'var(--text-label-md-size)', fontWeight: 600, color: 'var(--color-primary)', margin: '0 0 12px 0' },
  timeline: { position: 'relative', paddingLeft: 24 },
  tlLine: { position: 'absolute', left: 7, top: 8, bottom: 0, width: 2, background: 'var(--color-surface-container-high)' },
  tlEvent: { position: 'relative', display: 'flex', gap: 16, marginBottom: 24 },
  tlDot: { position: 'absolute', left: -24, top: 4, width: 16, height: 16, borderRadius: '50%', background: 'var(--color-primary-container)', border: '4px solid var(--color-surface)' },
  tlTitle: { fontSize: 'var(--text-label-md-size)', fontWeight: 600, color: 'var(--color-on-surface)' },
  tlTime: { fontSize: 11, color: 'var(--color-on-surface-variant)', fontWeight: 500 },
  tlBody: { fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface-variant)', marginTop: 4, lineHeight: 1.5, background: 'var(--color-surface-container-lowest)', padding: 12, borderRadius: 8, border: '1px solid var(--color-surface-container)' },
};

// Responsive: 2-col on wide, 1-col on narrow
