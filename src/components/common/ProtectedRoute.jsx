import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>AutoParts Pro</div>
          <div style={{ marginTop: '8px', color: 'var(--text-muted)' }}>Verifying credentials...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '40px auto' }}>
        <div className="card" style={{ borderLeft: '4px solid #dc2626', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚫</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>
            Access Restricted
          </h2>
          <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            This administrative module requires Administrator permissions. Your account is assigned to the <strong>Staff</strong> role.
          </p>
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={() => window.history.back()}
              className="btn btn-secondary"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
