import React from 'react';
import { useNavigate } from 'react-router-dom';
import './UIPrimitives.css';

interface PlaceholderPageProps {
  title: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', height: '100%' }}>
      <div className="empty-state" style={{ maxWidth: '500px', padding: '40px' }}>
        <span style={{ fontSize: '64px' }}>🚀</span>
        <h2 style={{ fontSize: '24px', margin: '16px 0 8px', color: 'var(--text-h)' }}>{title} Module</h2>
        <p style={{ margin: '0 0 24px', color: 'var(--text-muted)', lineHeight: '1.5', fontSize: '15px' }}>
          This page is part of our upcoming roadmap. We're actively building this feature to help you track and maintain your study habits!
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/app')}>
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
