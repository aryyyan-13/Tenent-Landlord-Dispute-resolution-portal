import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'tenant',
    contact: '',
    address: ''
  });
  const [kycFile, setKycFile] = useState(null);
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
      if (kycFile) data.append('kycDocument', kycFile);

      await register(data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-semibold text-ink">TLDRP</h1>
          <p className="text-sm text-ink-light mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-panel border border-line rounded-sm p-7 space-y-4">
          {error && (
            <div className="text-sm text-danger bg-[#F3E2E2] border border-danger/30 rounded-sm px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-ink-light mb-1.5">I am registering as a</label>
            <div className="grid grid-cols-2 gap-2">
              {['tenant', 'landlord'].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setForm({ ...form, role: r })}
                  className={`border rounded-sm py-2 text-sm font-medium capitalize transition-colors ${
                    form.role === r
                      ? 'bg-ink text-paper border-ink'
                      : 'border-line text-ink-light hover:border-ink-light'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-light mt-1.5">
              Mediator and Admin accounts are created by the portal administrator.
            </p>
          </div>

          <div>
            <label className="block text-sm text-ink-light mb-1.5">Full name</label>
            <input
              required
              value={form.name}
              onChange={update('name')}
              className="w-full border border-line rounded-sm px-3 py-2 text-sm bg-paper focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-light mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={update('email')}
              className="w-full border border-line rounded-sm px-3 py-2 text-sm bg-paper focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-light mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={update('password')}
              className="w-full border border-line rounded-sm px-3 py-2 text-sm bg-paper focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-light mb-1.5">Contact number</label>
            <input
              value={form.contact}
              onChange={update('contact')}
              className="w-full border border-line rounded-sm px-3 py-2 text-sm bg-paper focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-light mb-1.5">Address</label>
            <textarea
              value={form.address}
              onChange={update('address')}
              rows={2}
              className="w-full border border-line rounded-sm px-3 py-2 text-sm bg-paper focus:border-accent transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-light mb-1.5">
              ID verification document (KYC) — optional
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setKycFile(e.target.files[0])}
              className="w-full text-sm text-ink-light file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border file:border-line file:bg-paper file:text-ink file:text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-ink text-paper rounded-sm py-2.5 text-sm font-medium hover:bg-ink-light transition-colors disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-sm text-ink-light text-center pt-2">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent-dark font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
