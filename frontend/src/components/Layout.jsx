import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/* ─────────────────────────────────────────────────
   Shared Layout Shell
   Fixed 260px sidebar + 56px topbar — all authenticated pages
──────────────────────────────────────────────────── */

const NAV_ITEMS = [
  { path: '/',            label: 'Dashboard',    icon: 'grid_view',     roles: null },
  { path: '/file-dispute',label: 'File a Dispute',icon: 'gavel',        roles: ['tenant', 'landlord'] },
  { path: '/cases',       label: 'Case Tracking', icon: 'folder_shared', roles: null },
  { path: '/admin',       label: 'Admin Panel',   icon: 'verified_user', roles: ['admin'] },
];

const RESOURCE_ITEMS = [
  { path: '#guidelines', label: 'Guidelines & Statutes', icon: 'menu_book' },
  { path: '#help',       label: 'Support & Help',        icon: 'help_outline' },
];

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleNav = NAV_ITEMS.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );

  const sidebar = (
    <aside className={`app-sidebar ${mobileOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div style={styles.sidebarInner}>
        <div style={styles.logoBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={styles.logoMark}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>balance</span>
            </div>
            <div>
              <div style={styles.logoName}>TLDRP</div>
              <div style={styles.logoSub}>Civic Portal</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={styles.versionBadge}>v2.4</span>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              style={{ display: mobileOpen ? 'flex' : 'none', padding: 2 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>

        {/* Dispute Management nav */}
        <div style={styles.navSection}>
          <div style={styles.navSectionLabel}>Dispute Management</div>
          <nav>
            {visibleNav.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileOpen(false)}
                style={({ isActive }) => ({
                  ...styles.navLink,
                  ...(isActive ? styles.navLinkActive : {}),
                })}
              >
                {({ isActive }) => (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, lineHeight: 1 }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {isActive && <span style={styles.navActiveAccent} />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Statutory Resources */}
        <div style={styles.navSection}>
          <div style={styles.navSectionLabel}>Statutory Resources</div>
          <nav>
            {RESOURCE_ITEMS.map(item => (
              <a
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                style={styles.navLink}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, lineHeight: 1 }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* User card */}
      <div style={styles.userCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={styles.avatar}>{initials(user?.name)}</div>
            <span style={styles.avatarDot} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={styles.userName}>{user?.name || 'User'}</div>
            <div style={styles.userRole}>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}</div>
          </div>
        </div>
        <div style={styles.userCardFooter}>
          <span style={styles.statusDot}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-secondary)', display: 'inline-block', marginRight: 4 }} />
            Active
          </span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Sign out</button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="app-root">
      {/* Sidebar (Desktop fixed, Mobile off-canvas drawer) */}
      {sidebar}

      {/* Mobile backdrop overlay */}
      <div
        className={`mobile-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Main area */}
      <div className="app-main">
        {/* Topbar */}
        <header className="app-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(prev => !prev)}
              className="mobile-menu-btn"
              aria-label="Toggle navigation"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>menu</span>
            </button>
            <span style={styles.jurisdiction}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-secondary)', lineHeight: 1 }}>account_balance</span>
              <span className="topbar-jurisdiction-text">Metropolitan Housing Authority • Jurisdiction Ward 4</span>
              <span className="topbar-jurisdiction-short" style={{ display: 'none' }}>Ward 4</span>
            </span>
          </div>

          <div style={styles.topbarRight}>
            {/* Search (Desktop & Tablet) */}
            <div className="topbar-search-box" style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={styles.searchIcon}>search</span>
              <input
                type="text"
                placeholder="Search docket, address, party..."
                style={styles.searchInput}
              />
            </div>

            {/* Emergency Escalation */}
            <a href="tel:311" className="topbar-emergency-link" style={styles.emergencyLink}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>call</span>
              Emergency 311
            </a>

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button style={styles.iconBtn} aria-label="Notifications">
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
              </button>
              <span style={styles.notifDot} />
            </div>

            {/* Avatar */}
            <div style={{ ...styles.avatar, width: 32, height: 32, fontSize: 12 }}>
              {initials(user?.name)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ─── Inline styles (design tokens) ─── */
const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--color-surface)',
  },

  /* Sidebar */
  sidebar: {
    position: 'fixed',
    left: 0, top: 0,
    height: '100vh',
    width: 'var(--sidebar-width)',
    background: 'var(--color-surface-container-lowest)',
    borderRight: '1px solid var(--color-outline-variant)',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    userSelect: 'none',
    overflowY: 'auto',
  },
  sidebarInner: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoBar: {
    height: 56,
    padding: '0 var(--space-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--color-outline-variant)',
    flexShrink: 0,
  },
  logoMark: {
    width: 32, height: 32,
    borderRadius: 'var(--radius)',
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoName: {
    fontFamily: 'var(--font-serif)',
    fontSize: 'var(--text-headline-sm-size)',
    fontWeight: 600,
    color: 'var(--color-primary)',
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },
  logoSub: {
    fontSize: 'var(--text-label-sm-size)',
    color: 'var(--color-on-surface-variant)',
    fontWeight: 500,
  },
  versionBadge: {
    background: 'var(--color-surface-container-high)',
    color: 'var(--color-on-surface-variant)',
    border: '1px solid var(--color-outline-variant)',
    borderRadius: 'var(--radius)',
    fontSize: 11,
    fontWeight: 500,
    padding: '1px 6px',
  },
  navSection: {
    padding: 'var(--space-sm) 0',
  },
  navSectionLabel: {
    padding: 'var(--space-sm) var(--space-md)',
    fontSize: 'var(--text-label-sm-size)',
    fontWeight: 600,
    color: 'var(--color-on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 16px',
    margin: '1px 8px',
    borderRadius: 8,
    fontSize: 'var(--text-body-sm-size)',
    color: 'var(--color-on-surface-variant)',
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
    position: 'relative',
    cursor: 'pointer',
  },
  navLinkActive: {
    background: 'var(--color-primary-container)',
    color: 'var(--color-on-primary)',
    fontWeight: 600,
    borderLeft: '3px solid var(--color-secondary-container)',
    paddingLeft: 13,
  },
  navActiveAccent: {
    display: 'none', // handled by borderLeft on parent
  },

  /* User card */
  userCard: {
    padding: 'var(--space-md)',
    borderTop: '1px solid var(--color-outline-variant)',
    background: 'var(--color-surface-container-lowest)',
  },
  avatar: {
    width: 32, height: 32,
    borderRadius: '50%',
    background: 'var(--color-primary-container)',
    color: 'var(--color-on-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 600,
    flexShrink: 0,
    border: '1px solid var(--color-outline-variant)',
  },
  avatarDot: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 10, height: 10,
    borderRadius: '50%',
    background: 'var(--color-secondary-container)',
    border: '2px solid var(--color-surface-container-lowest)',
  },
  userName: {
    fontSize: 'var(--text-label-md-size)',
    fontWeight: 600,
    color: 'var(--color-on-surface)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: 'var(--text-label-sm-size)',
    color: 'var(--color-on-surface-variant)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userCardFooter: {
    marginTop: 8,
    paddingTop: 6,
    borderTop: '1px solid var(--color-surface-container)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 'var(--text-label-sm-size)',
  },
  statusDot: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--color-on-surface-variant)',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--text-label-sm-size)',
    color: 'var(--color-secondary)',
    cursor: 'pointer',
    fontWeight: 600,
    padding: 0,
  },

  /* Main content area */
  main: {
    marginLeft: 'var(--sidebar-width)',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },

  /* Topbar */
  topbar: {
    position: 'fixed',
    top: 0,
    left: 'var(--sidebar-width)',
    right: 0,
    height: 'var(--topbar-height)',
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid var(--color-outline-variant)',
    zIndex: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 var(--space-xl)',
  },
  jurisdiction: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 'var(--text-label-md-size)',
    fontWeight: 500,
    color: 'var(--color-on-surface-variant)',
  },
  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 18,
    color: 'var(--color-on-surface-variant)',
    lineHeight: 1,
    pointerEvents: 'none',
  },
  searchInput: {
    width: 280,
    height: 32,
    paddingLeft: 34,
    paddingRight: 12,
    background: 'var(--color-surface-container-low)',
    border: '1px solid var(--color-outline-variant)',
    borderRadius: 8,
    fontSize: 'var(--text-body-sm-size)',
    color: 'var(--color-on-surface)',
    outline: 'none',
  },
  emergencyLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 'var(--text-label-sm-size)',
    fontWeight: 500,
    color: 'var(--color-secondary)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  iconBtn: {
    width: 32, height: 32,
    borderRadius: 8,
    background: 'none',
    border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--color-on-surface-variant)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  notifDot: {
    position: 'absolute',
    top: 4, right: 4,
    width: 8, height: 8,
    borderRadius: '50%',
    background: 'var(--color-error)',
    border: '2px solid var(--color-surface-container-lowest)',
  },

  /* Page content */
  content: {
    marginTop: 'var(--topbar-height)',
    flex: 1,
    background: 'var(--color-surface)',
  },

  /* Mobile */
  mobileMenuBtn: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: 'var(--color-on-surface-variant)',
    cursor: 'pointer',
    padding: 4,
  },
  mobileOverlay: {
    display: 'none',
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 49,
  },
};
