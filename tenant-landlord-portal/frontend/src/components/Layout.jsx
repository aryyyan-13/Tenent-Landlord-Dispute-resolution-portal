import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABEL = {
  tenant: 'Tenant',
  landlord: 'Landlord',
  mediator: 'Mediator',
  admin: 'Administrator'
};

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `block px-4 py-2.5 text-sm rounded-sm transition-colors ${
          isActive
            ? 'bg-ink text-paper font-medium'
            : 'text-ink-light hover:bg-line/40'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-64 shrink-0 border-r border-line bg-panel flex flex-col">
        <div className="px-5 py-6 border-b border-line">
          <h1 className="font-serif text-lg font-semibold leading-tight text-ink">
            TLDRP
          </h1>
          <p className="text-xs text-ink-light mt-1">Dispute Resolution Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem to="/">Dashboard</NavItem>
          {(user.role === 'tenant' || user.role === 'landlord') && (
            <NavItem to="/file-dispute">File a Dispute</NavItem>
          )}
          <NavItem to="/cases">Case Tracking</NavItem>
          {user.role === 'admin' && <NavItem to="/admin">Admin Panel</NavItem>}
        </nav>

        <div className="px-5 py-4 border-t border-line">
          <p className="text-sm font-medium text-ink truncate">{user.name}</p>
          <p className="text-xs text-ink-light">{ROLE_LABEL[user.role]}</p>
          <button
            onClick={handleLogout}
            className="mt-3 text-xs text-accent hover:text-accent-dark font-medium"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
