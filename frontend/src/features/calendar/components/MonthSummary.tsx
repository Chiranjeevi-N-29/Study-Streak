import React from 'react';
import type { StudyPlan } from '../../../services/api.js';
import '../Calendar.css';

interface MonthSummaryProps {
  plans: StudyPlan[];
  year: number;
  month: number; // 0-indexed
}

export const MonthSummary: React.FC<MonthSummaryProps> = ({ plans, year, month }) => {
  // Compute monthly metrics
  let successfulDays = 0;
  let restDays = 0;
  let missedDays = 0;
  let totalMinutesLogged = 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // Create lookup map for plans by date string YYYY-MM-DD
  const planMap = new Map<string, StudyPlan>();
  plans.forEach((p) => planMap.set(p.date, p));

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    const plan = planMap.get(dateStr);

    const isFuture =
      year > currentYear ||
      (year === currentYear && month > currentMonth) ||
      (year === currentYear && month === currentMonth && day > currentDay);

    if (plan) {
      if (plan.status === 'COMPLETED' || plan.status === 'PARTIALLY_COMPLETED') {
        successfulDays++;
      } else if (plan.status === 'REST_DAY') {
        restDays++;
      } else if (plan.status === 'MISSED') {
        missedDays++;
      } else if (!isFuture && plan.status === 'NOT_COMPLETED') {
        missedDays++;
      }

      // Sum task actual durations
      if (plan.tasks && plan.tasks.length > 0) {
        plan.tasks.forEach((t) => {
          totalMinutesLogged += t.actualDuration || 0;
        });
      }
    } else if (!isFuture) {
      // Past day without a plan counts as a missed study day if day < today
      if (
        year < currentYear ||
        (year === currentYear && month < currentMonth) ||
        (year === currentYear && month === currentMonth && day < currentDay)
      ) {
        missedDays++;
      }
    }
  }

  // Format hours and minutes
  const hours = Math.floor(totalMinutesLogged / 60);
  const minutes = totalMinutesLogged % 60;
  const formattedStudyTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="month-summary-grid">
      <div className="month-summary-card">
        <div className="month-summary-icon">🔥</div>
        <div className="month-summary-info">
          <span className="month-summary-value">{successfulDays}</span>
          <span className="month-summary-label">Successful Days</span>
        </div>
      </div>
      <div className="month-summary-card">
        <div className="month-summary-icon">🌿</div>
        <div className="month-summary-info">
          <span className="month-summary-value">{restDays}</span>
          <span className="month-summary-label">Rest Days</span>
        </div>
      </div>
      <div className="month-summary-card">
        <div className="month-summary-icon">❌</div>
        <div className="month-summary-info">
          <span className="month-summary-value">{missedDays}</span>
          <span className="month-summary-label">Missed Days</span>
        </div>
      </div>
      <div className="month-summary-card">
        <div className="month-summary-icon">⏱</div>
        <div className="month-summary-info">
          <span className="month-summary-value">{formattedStudyTime}</span>
          <span className="month-summary-label">Total Study Time</span>
        </div>
      </div>
    </div>
  );
};
