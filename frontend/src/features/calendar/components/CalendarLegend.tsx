import React from 'react';
import '../Calendar.css';

export const CalendarLegend: React.FC = () => {
  return (
    <div className="calendar-legend">
      <div className="legend-item">
        <span className="status-chip status-success">✓</span>
        <span>Completed / Success</span>
      </div>
      <div className="legend-item">
        <span className="status-chip status-rest">🌿</span>
        <span>Rest Day</span>
      </div>
      <div className="legend-item">
        <span className="status-chip status-missed">❌</span>
        <span>Missed Day</span>
      </div>
      <div className="legend-item">
        <span className="status-chip status-pending">⏳</span>
        <span>Pending / In Progress</span>
      </div>
    </div>
  );
};
