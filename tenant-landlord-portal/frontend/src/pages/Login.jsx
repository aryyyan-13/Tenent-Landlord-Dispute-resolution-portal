import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-semibold text-ink">TLDRP</h1>
          <p className="text-sm text-ink-light mt-1">Tenant-Landlord Dispute Resolution Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-panel border border-line rounded-sm p-7 space-y-4">
          <h2 className="font-serif text-lg text-ink mb-1">Sign in</h2>

          {error && (
            <div className="text-sm text-danger bg-[#F3E2E2] border border-danger/30 rounded-sm px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-ink-light mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line rounded-sm px-3 py-2 text-sm bg-paper focus:border-accent transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-light mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-line rounded-sm px-3 py-2 text-sm bg-paper focus:border-accent transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-ink text-paper rounded-sm py-2.5 text-sm font-medium hover:bg-ink-light transition-colors disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-sm text-ink-light text-center pt-2">
            New here?{' '}
            <Link to="/register" className="text-accent hover:text-accent-dark font-medium">
              Create an account
            </Link>
          </p>
        </form>

        <div className="mt-6 border border-line rounded-sm bg-panel/60 p-4 text-xs text-ink-light">
          <p className="font-medium text-ink mb-1.5">Test credentials (after seeding the database)</p>
          <ul className="space-y-0.5">
            <li>Tenant — tenant@tldrp.test / Tenant@123</li>
            <li>Landlord — landlord@tldrp.test / Landlord@123</li>
            <li>Mediator — mediator@tldrp.test / Mediator@123</li>
            <li>Admin — admin@tldrp.test / Admin@123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
