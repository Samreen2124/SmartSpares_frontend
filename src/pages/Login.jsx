import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await login(username, password);

    if (result.success) {
      navigate(redirectPath, { replace: true });
    } else {
      setErrorMsg(result.error);
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      padding: '20px',
      fontFamily: 'var(--font-family)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        border: '1px solid #334155'
      }}>
        {/* Brand Top Header */}
        <div style={{
          backgroundColor: '#1e293b',
          color: '#ffffff',
          padding: '28px 24px',
          textAlign: 'center',
          borderBottom: '3px solid var(--accent-blue)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: 'var(--accent-blue)',
            borderRadius: '10px',
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#fff',
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)'
          }}>
            AP
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            AutoParts Pro
          </h1>
          <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '4px' }}>
            Automobile Spare Parts Management System
          </p>
        </div>

        {/* Login Form Body */}
        <div style={{ padding: '28px 24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Account Sign-In
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Enter your authorized staff or administrator credentials.
          </p>

          {errorMsg && (
            <div style={{
              padding: '12px 14px',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger-text)',
              border: '1px solid var(--status-danger-border)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                className="form-control"
                placeholder="e.g. admin or staff_rahul"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px 16px', fontSize: '0.95rem' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In to AutoParts Pro →'}
            </button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-light)'
          }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              Quick-Test Demo Credentials
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin123')}
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  fontSize: '0.78rem',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  backgroundColor: '#f8fafc'
                }}
              >
                <strong>👑 Admin Role</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>admin / admin123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('staff_rahul', 'staff123')}
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  fontSize: '0.78rem',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  backgroundColor: '#f8fafc'
                }}
              >
                <strong>💼 Staff Role</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>staff_rahul / staff123</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-light)'
        }}>
          Protected by SimpleJWT HS256 Token Encryption & Role-Based Access
        </div>
      </div>
    </div>
  );
}
