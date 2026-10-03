import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from './Layout.jsx';

export default function PrivateRoute({ children, roles }) {
  const { user, initializing } = useAuth();

  // Wait for localStorage auth state to be resolved before deciding
  if (initializing) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--color-surface, #faf9f6)'
      }}>
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 32, color: 'var(--color-primary, #061624)' }}>
          progress_activity
        </span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return (
      <Layout>
        <div className="border border-line rounded-sm bg-panel p-8 text-center">
          <h2 className="font-serif text-xl text-ink mb-2">Access restricted</h2>
          <p className="text-ink-light text-sm">
            Your role ({user.role}) does not have permission to view this page.
          </p>
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
}

