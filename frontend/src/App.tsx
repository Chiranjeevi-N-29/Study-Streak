import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { LoginPage } from './features/auth/LoginPage.js';
import { RegisterPage } from './features/auth/RegisterPage.js';
import { StudyPlanner } from './features/planner/StudyPlanner.js';
import { DashboardPage } from './features/dashboard/DashboardPage.js';
import { AppShell } from './components/AppShell.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { GuestRoute } from './components/GuestRoute.js';
import { CalendarPage } from './features/calendar/CalendarPage.js';
import { AnalyticsPage } from './features/analytics/AnalyticsPage.js';
import { PlaceholderPage } from './components/PlaceholderPage.js';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Routes */}
            <Route 
              path="/login" 
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              } 
            />

            {/* Protected Application Layout Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="/app" element={<DashboardPage />} />
              <Route path="/app/planner" element={<StudyPlanner />} />
              <Route path="/app/calendar" element={<CalendarPage />} />
              <Route path="/app/analytics" element={<AnalyticsPage />} />
              <Route path="/app/reflections" element={<PlaceholderPage title="Reflections" />} />
              <Route path="/app/achievements" element={<PlaceholderPage title="Achievements" />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
            </Route>

            {/* Redirect all unmatched routes to home dashboard */}
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
