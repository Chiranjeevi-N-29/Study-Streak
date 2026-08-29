import React from 'react';
import { useAuth } from '../auth/AuthContext.js';

export const DashboardPlaceholder: React.FC = () => {
  const { user, logout, loading } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  if (!user) return null;

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '20px', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', margin: '0 0 8px' }}>🔥 StudyStreak</h1>
          <p style={{ margin: '0', color: 'var(--text)' }}>Welcome back, <strong>{user.name}</strong>!</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={loading}
          style={{ padding: '10px 16px', background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-h)', fontWeight: '500', cursor: 'pointer' }}
        >
          {loading ? 'Logging out...' : 'Log Out'}
        </button>
      </header>

      <main style={{ display: 'grid', gap: '24px' }}>
        <section style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '24px' }}>
          <h2 style={{ fontSize: '20px', marginTop: '0', marginBottom: '16px' }}>🔒 Secure User Profile</h2>
          <div style={{ display: 'grid', gap: '12px', fontSize: '15px' }}>
            <p style={{ margin: '0' }}><strong>User ID:</strong> <code>{user.id}</code></p>
            <p style={{ margin: '0' }}><strong>Email:</strong> <code>{user.email}</code></p>
            <p style={{ margin: '0' }}><strong>Timezone:</strong> <code>{user.timezone}</code></p>
            <p style={{ margin: '0' }}><strong>Registered:</strong> <code>{new Date(user.createdAt).toLocaleDateString()}</code></p>
          </div>
        </section>

        <section style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: '8px', padding: '24px', color: 'var(--text-h)' }}>
          <h2 style={{ fontSize: '20px', marginTop: '0', marginBottom: '12px', color: 'var(--accent)' }}>🚀 Project Milestone Status</h2>
          <p style={{ margin: '0 0 12px', lineHeight: '150%' }}>
            <strong>Milestone 2 (Authentication) is successfully loaded!</strong> You are currently viewing the protected placeholder dashboard route.
          </p>
          <p style={{ margin: '0', fontSize: '14px', color: 'var(--text)' }}>
            Endpoints verified: <code>POST /api/auth/register</code>, <code>POST /api/auth/login</code>, <code>POST /api/auth/logout</code>, and <code>GET /api/auth/me</code>.
          </p>
        </section>
      </main>
    </div>
  );
};
