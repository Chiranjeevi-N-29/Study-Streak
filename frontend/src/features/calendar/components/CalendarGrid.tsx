import React from 'react';
import { CalendarDayCell } from './CalendarDayCell.js';
import type { StudyPlan } from '../../../services/api.js';
import '../Calendar.css';

interface CalendarGridProps {
  year: number;
  month: number; // 0 - 11
  plans: StudyPlan[];
  onSelectDay: (dateStr: string, plan: StudyPlan | null) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  plans,
  onSelectDay,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // Create lookup map for plans by date string YYYY-MM-DD
  const planMap = new Map<string, StudyPlan>();
  plans.forEach((p) => planMap.set(p.date, p));

  // Determine number of days in month
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Determine starting weekday of the 1st of the month (0 = Mon, 6 = Sun)
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells = [];

  // 1. Empty padding cells before 1st of month
  for (let i = 0; i < startOffset; i++) {
    cells.push(
      <CalendarDayCell
        key={`empty-${i}`}
        dateStr=""
        dayNumber={0}
        isToday={false}
        isFuture={false}
        isEmpty={true}
        plan={null}
        onClick={() => {}}
      />
    );
  }

  // 2. Days of current month
  for (let day = 1; day <= totalDays; day++) {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    const isToday =
      year === currentYear && month === currentMonth && day === currentDay;

    const isFuture =
      year > currentYear ||
      (year === currentYear && month > currentMonth) ||
      (year === currentYear && month === currentMonth && day > currentDay);

    const plan = planMap.get(dateStr) || null;

    cells.push(
      <CalendarDayCell
        key={dateStr}
        dateStr={dateStr}
        dayNumber={day}
        isToday={isToday}
        isFuture={isFuture}
        isEmpty={false}
        plan={plan}
        onClick={() => onSelectDay(dateStr, plan)}
      />
    );
  }

  return (
    <div className="card-primitive calendar-grid-card">
      <div className="weekday-header-grid">
        {WEEKDAYS.map((day) => (
          <div key={day} className="weekday-cell">
            {day}
          </div>
        ))}
      </div>
      <div className="days-grid">{cells}</div>
    </div>
  );
};
