import React from 'react';
import './PWAComponents.css';

interface UpdateBannerProps {
  onRefresh?: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ onRefresh }) => {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="pwa-banner update-banner" role="alert">
      <span className="pwa-banner-icon">🚀</span>
      <div className="pwa-banner-content">
        <strong>New Version Available!</strong> A new version of StudyStreak is ready.
      </div>
      <button className="btn btn-primary btn-sm" onClick={handleRefresh} style={{ marginLeft: 'auto' }}>
        Refresh
      </button>
    </div>
  );
};
