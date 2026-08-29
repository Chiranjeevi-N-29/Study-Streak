import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext.js';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const { register, error, loading, setError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setError(null);

    // Form Validation Checks
    if (!name || !email || !password || !confirmPassword) {
      setFormError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setFormError('Password must contain at least one letter and one number.');
      return;
    }

    try {
      await register(name, email, password);
      navigate('/');
    } catch {
      // Error is stored in AuthContext and displayed
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80svh', padding: '16px' }}>
      <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow)', textAlign: 'left' }}>
        <h1 style={{ fontSize: '32px', marginTop: '0', marginBottom: '8px', textAlign: 'center' }}>Create Account</h1>
        <p style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '24px', textAlign: 'center' }}>Join StudyStreak to start consistent daily learning</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="name" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-h)', marginBottom: '6px' }}>Your Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chiranjeevi"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-h)', marginBottom: '6px' }}>Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
            />
          </div>
          
          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-h)', marginBottom: '6px' }}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 chars, letter + number"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-h)', marginBottom: '6px' }}>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
            />
          </div>

          {(formError || error) && (
            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', color: '#ef4444', fontSize: '14px' }}>
              {formError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '16px', fontWeight: '500', cursor: 'pointer', transition: 'opacity 0.2s', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Registering...' : 'Sign Up'}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '14px', color: 'var(--text)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}>Log In</Link>
        </p>
      </div>
    </div>
  );
};
