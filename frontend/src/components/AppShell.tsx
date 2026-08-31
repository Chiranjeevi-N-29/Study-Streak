import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import './AppShell.css';
import './UIPrimitives.css';

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu when route changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Handle clicking outside profile dropdown to close it
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutsideClick = () => {
      setDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="app-layout">
      {/* Header Panel */}
      <header className="app-header">
        <div className="header-left">
          <button 
            className="mobile-toggle-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            ☰
          </button>
          <div className="app-logo">
            <span className="logo-icon">🔥</span>
            <span className="logo-text">StudyStreak</span>
          </div>
        </div>
        
        <div className="header-right">
          {/* Theme Switcher Button */}
          <button 
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Profile Dropdown */}
          <div className="profile-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className="profile-trigger" 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <div className="avatar">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <span className="profile-name">{user?.name}</span>
              <span className="dropdown-caret">▼</span>
            </button>

            {dropdownOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <p className="dropdown-user-email">{user?.email}</p>
                  <p className="dropdown-user-tz">TZ: {user?.timezone}</p>
                </div>
                <hr className="dropdown-divider" />
                <button className="dropdown-item" onClick={handleLogout}>
                  🚪 Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <div className="app-body">
        {/* Navigation Sidebar */}
        <aside className={`app-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <nav className="sidebar-nav">
            <div className="nav-group">
              <NavLink 
                to="/app" 
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                🏠 Dashboard
              </NavLink>
              <NavLink 
                to="/app/planner" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                📚 Study Planner
              </NavLink>
              <NavLink 
                to="/app/calendar" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                📅 Calendar
              </NavLink>
              <NavLink 
                to="/app/analytics" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                📈 Analytics
              </NavLink>
              <NavLink 
                to="/app/reflections" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                💭 Reflections
              </NavLink>
              <NavLink 
                to="/app/achievements" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                🏆 Achievements
              </NavLink>
            </div>
            
            <div className="sidebar-footer">
              <NavLink 
                to="/settings" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                ⚙️ Settings
              </NavLink>
            </div>
          </nav>
        </aside>

        {/* Backdrop for mobile menu overlay */}
        {mobileMenuOpen && (
          <div 
            className="sidebar-backdrop" 
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Content Panel Container */}
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
