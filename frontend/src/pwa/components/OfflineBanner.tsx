import React, { useEffect, useState } from 'react';
import { useOnlineStatus } from '../useOnlineStatus.js';
import './PWAComponents.css';

export const OfflineBanner: React.FC = () => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showOnlineToast, setShowOnlineToast] = useState<boolean>(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowOnlineToast(true);
      const timer = setTimeout(() => {
        setShowOnlineToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div className="pwa-banner offline-banner" role="status" aria-live="polite">
        <span className="pwa-banner-icon">⚠️</span>
        <div className="pwa-banner-content">
          <strong>You're offline.</strong>
          <span> Cached app shell active. Connect to internet to sync new changes.</span>
        </div>
      </div>
    );
  }

  if (showOnlineToast) {
    return (
      <div className="pwa-banner online-banner" role="status" aria-live="polite">
        <span className="pwa-banner-icon">✓</span>
        <div className="pwa-banner-content">
          <strong>Back online.</strong> All network services restored!
        </div>
      </div>
    );
  }

  return null;
};
