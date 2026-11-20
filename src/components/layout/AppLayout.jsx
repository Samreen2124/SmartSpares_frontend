import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout({ children }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = () => {
    logout(true);
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Products Catalog', path: '/products', icon: '📦' },
    { name: 'Vehicle Categories', path: '/categories', icon: '🚜' },
    { name: 'Suppliers', path: '/suppliers', icon: '🏭' },
    { name: 'Customers', path: '/customers', icon: '👥' },
    { name: 'Purchases', path: '/purchases', icon: '🛒' },
    { name: 'Sales & Billing', path: '/sales', icon: '💳' },
    { name: 'Battery Exchange', path: '/batteries', icon: '🔋' },
    { name: 'Inventory Logs', path: '/inventory', icon: '📋' },
    { name: 'Reports & Analytics', path: '/reports', icon: '📈' },
  ];

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--sidebar-navy)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #334155',
        flexShrink: 0
      }}>
        {/* Brand Header */}
        <div style={{
          padding: '20px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'var(--accent-blue)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.25rem',
            color: '#fff',
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)'
          }}>
            AP
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#fff' }}>
              AutoParts Pro
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Auto Spares ERP & POS
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ padding: '16px 10px', flex: 1, overflowY: 'auto' }}>
          <div style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#64748b',
            padding: '0 12px 10px'
          }}>
            Store Management
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    backgroundColor: isActive ? 'var(--accent-blue)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User Card Bottom Sidebar */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #334155',
          backgroundColor: '#0f172a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: isAdmin ? '#8b5cf6' : '#0284c7',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}>
              {user?.username?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user?.full_name || user?.username}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: isAdmin ? '#7c3aed' : '#0369a1',
                  color: '#fff',
                  fontWeight: 600
                }}>
                  {isAdmin ? 'ADMIN' : 'STAFF'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  @{user?.username}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="btn btn-secondary"
            style={{
              width: '100%',
              fontSize: '0.8rem',
              padding: '6px',
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              borderColor: '#475569'
            }}
          >
            Sign Out ⎋
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{
          height: '64px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>AutoParts Pro /</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {navItems.find(i => location.pathname === i.path || (i.path !== '/' && location.pathname.startsWith(i.path)))?.name || 'Dashboard'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="badge badge-info" style={{ fontSize: '0.75rem', textTransform: 'none' }}>
              MySQL 8.4 Connected (Port 3307)
            </span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: '#f1f5f9',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)'
            }}>
              <span>Role:</span>
              <strong style={{ color: isAdmin ? '#7c3aed' : '#0284c7' }}>
                {isAdmin ? '👑 Administrator' : '💼 Staff'}
              </strong>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="page-body" style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
