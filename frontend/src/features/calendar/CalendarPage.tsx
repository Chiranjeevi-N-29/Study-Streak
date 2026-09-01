import React, { useCallback, useEffect, useState } from 'react';
import { CalendarHeader } from './components/CalendarHeader.js';
import { MonthSummary } from './components/MonthSummary.js';
import { CalendarGrid } from './components/CalendarGrid.js';
import { CalendarLegend } from './components/CalendarLegend.js';
import { DayDetailModal } from './components/DayDetailModal.js';
import type { StudyPlan } from '../../services/api.js';
import { studyPlanApi } from '../../services/api.js';
import './Calendar.css';
import '../../components/UIPrimitives.css';

export const CalendarPage: React.FC = () => {

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth()); // 0-indexed

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<{
    dateStr: string;
    plan: StudyPlan | null;
  } | null>(null);

  // Fetch month range data
  const fetchMonthPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const formattedMonth = String(month + 1).padStart(2, '0');
      const totalDays = new Date(year, month + 1, 0).getDate();
      const formattedLastDay = String(totalDays).padStart(2, '0');

      const startDate = `${year}-${formattedMonth}-01`;
      const endDate = `${year}-${formattedMonth}-${formattedLastDay}`;

      const res = await studyPlanApi.getRange(startDate, endDate);
      if (res.success) {
        setPlans(res.studyPlans);
      }
    } catch (err) {
      console.error('Calendar range fetch error:', err);
      setError("We couldn't load your study history.");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMonthPlans();
  }, [fetchMonthPlans]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  // Day selection
  const handleSelectDay = (dateStr: string, plan: StudyPlan | null) => {
    setSelectedDay({ dateStr, plan });
  };

  // Callback when a plan/task is updated from inside the modal
  const handlePlanUpdated = async () => {
    await fetchMonthPlans();
    if (selectedDay) {
      // Refresh current selected plan
      const updatedPlans = await studyPlanApi.getRange(
        selectedDay.dateStr,
        selectedDay.dateStr
      );
      if (updatedPlans.success && updatedPlans.studyPlans.length > 0) {
        setSelectedDay({
          dateStr: selectedDay.dateStr,
          plan: updatedPlans.studyPlans[0],
        });
      } else {
        setSelectedDay({
          dateStr: selectedDay.dateStr,
          plan: null,
        });
      }
    }
  };

  if (error) {
    return (
      <div className="calendar-page-container">
        <div
          style={{
            height: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div className="card-primitive" style={{ maxWidth: '400px', padding: '32px' }}>
            <span style={{ fontSize: '48px' }}>⚠️</span>
            <h2 style={{ fontSize: '20px', margin: '16px 0 8px', color: 'var(--text-h)' }}>
              Connection Issue
            </h2>
            <p style={{ margin: '0 0 24px', color: 'var(--text-muted)', fontSize: '14px' }}>
              {error}
            </p>
            <button className="btn btn-primary" onClick={fetchMonthPlans} style={{ width: '100%' }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-page-container">
      {/* Month Navigation & Title */}
      <CalendarHeader
        year={year}
        month={month}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
      />

      {/* Monthly Summary Statistics Bar */}
      <MonthSummary plans={plans} year={year} month={month} />

      {/* Calendar Grid Section */}
      {loading ? (
        <div className="card-primitive" style={{ padding: '60px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Loading study calendar...</p>
        </div>
      ) : (
        <>
          <CalendarGrid
            year={year}
            month={month}
            plans={plans}
            onSelectDay={handleSelectDay}
          />
          <CalendarLegend />
        </>
      )}

      {/* Day Detail Modal */}
      {selectedDay && (
        <DayDetailModal
          dateStr={selectedDay.dateStr}
          plan={selectedDay.plan}
          onClose={() => setSelectedDay(null)}
          onPlanUpdated={handlePlanUpdated}
        />
      )}
    </div>
  );
};
