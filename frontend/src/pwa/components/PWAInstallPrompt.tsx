import React from 'react';
import { usePWAInstall } from '../usePWAInstall.js';
import './PWAComponents.css';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, promptInstall, dismissInstall } = usePWAInstall();

  if (!isInstallable) {
    return null;
  }

  return (
    <div className="pwa-install-card" role="dialog" aria-label="Install StudyStreak Application">
      <div className="pwa-install-header">
        <span className="pwa-install-icon">🔥</span>
        <div className="pwa-install-info">
          <div className="pwa-install-title">Install StudyStreak</div>
          <div className="pwa-install-desc">
            Get quick access to your study planner & focus timer directly from your desktop or home screen.
          </div>
        </div>
      </div>
      <div className="pwa-install-actions">
        <button className="btn btn-primary btn-sm" onClick={promptInstall}>
          Install App
        </button>
        <button className="btn btn-secondary btn-sm" onClick={dismissInstall}>
          Not Now
        </button>
      </div>
    </div>
  );
};
