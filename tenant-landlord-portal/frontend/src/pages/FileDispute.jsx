import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const CATEGORIES = ['Security Deposit', 'Rent Payment', 'Maintenance', 'Property Damage', 'Agreement Violation'];

export default function FileDispute() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ category: CATEGORIES[0], description: '', opposingPartyEmail: '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      Array.from(files).forEach((f) => data.append('evidence', f));

      const { data: result } = await client.post('/disputes', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate(`/cases/${result.dispute.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to file the dispute. Please check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="font-serif text-2xl text-ink">File a dispute</h1>
        <p className="text-sm text-ink-light mt-1">
          Describe the issue clearly and attach any supporting documents such as your rental agreement or payment
          receipts. The opposing party must already be a registered user of the portal.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="bg-panel border border-line rounded-sm p-6 space-y-5">
        {error && (
          <div className="text-sm text-danger bg-[#F3E2E2] border border-danger/30 rounded-sm px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-ink-light mb-1.5">Dispute category</label>
          <select
            value={form.category}
            onChange={update('category')}
            className="w-full border border-line rounded-sm px-3 py-2 text-sm bg-paper focus:border-accent transition-colors"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-ink-light mb-1.5">
            Opposing party's registered email
          </label>
          <input
            type="email"
            required
            value={form.opposingPartyEmail}
            onChange={update('opposingPartyEmail')}
            placeholder="landlord@example.com"
            className="w-full border border-line rounded-sm px-3 py-2 text-sm bg-paper focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-ink-light mb-1.5">Description of the issue</label>
          <textarea
            required
            rows={6}
            value={form.description}
            onChange={update('description')}
            placeholder="Explain what happened, when, and what resolution you are seeking..."
            className="w-full border border-line rounded-sm px-3 py-2 text-sm bg-paper focus:border-accent transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-ink-light mb-1.5">
            Supporting documents (rental agreement, receipts, photos — up to 5 files)
          </label>
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={(e) => setFiles(e.target.files)}
            className="w-full text-sm text-ink-light file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border file:border-line file:bg-paper file:text-ink file:text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-ink text-paper rounded-sm px-5 py-2.5 text-sm font-medium hover:bg-ink-light transition-colors disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit dispute'}
        </button>
      </form>
    </div>
  );
}
