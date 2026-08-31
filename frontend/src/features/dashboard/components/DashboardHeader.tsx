import React from 'react';
import '../Dashboard.css';

interface DashboardHeaderProps {
  name?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ name }) => {
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) {
      return 'Good morning';
    } else if (hours < 17) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  const getFormattedDate = () => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date());
  };

  return (
    <div className="dashboard-header-container">
      <h1 className="dashboard-greeting">
        {getGreeting()}, {name ?? 'User'} 👋
      </h1>
      <p className="dashboard-date">{getFormattedDate()}</p>
      <p className="dashboard-motivation">Let's make today count.</p>
    </div>
  );
};
