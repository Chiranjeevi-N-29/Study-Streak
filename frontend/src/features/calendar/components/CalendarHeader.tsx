import React from 'react';
import '../Calendar.css';
import '../../../components/UIPrimitives.css';

interface CalendarHeaderProps {
  year: number;
  month: number; // 0 - 11
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onToday,
}) => {
  return (
    <div className="card-primitive calendar-header-card">
      <div className="calendar-title-group">
        <h1 className="calendar-month-title">
          {MONTH_NAMES[month]} {year}
        </h1>
      </div>
      <div className="calendar-nav-buttons">
        <button
          className="btn btn-secondary"
          onClick={onPrevMonth}
          aria-label="Previous Month"
        >
          ‹ Previous Month
        </button>
        <button
          className="btn btn-secondary"
          onClick={onToday}
          aria-label="Go to Today"
        >
          Today
        </button>
        <button
          className="btn btn-secondary"
          onClick={onNextMonth}
          aria-label="Next Month"
        >
          Next Month ›
        </button>
      </div>
    </div>
  );
};
