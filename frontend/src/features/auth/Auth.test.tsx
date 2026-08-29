import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext.js';
import { LoginPage } from './LoginPage.js';
import { RegisterPage } from './RegisterPage.js';
import App from '../../App.js';

// Mock API calls
vi.mock('../../services/api.js', () => {
  return {
    authApi: {
      me: vi.fn().mockRejectedValue(new Error('No session')),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    },
  };
});

const renderWithRouterAndAuth = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthProvider>
  );
};

describe('Frontend Auth Flow - Login', () => {
  it('should render login form inputs after initialization', async () => {
    renderWithRouterAndAuth(<LoginPage />);
    
    // Wait for async authApi.me initialization to finish (button becomes enabled)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Log In/i })).toBeEnabled();
    });
    
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it('should validate blank inputs and show form error', async () => {
    renderWithRouterAndAuth(<LoginPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Log In/i })).toBeEnabled();
    });

    const submitBtn = screen.getByRole('button', { name: /Log In/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/enter both email and password/i)).toBeInTheDocument();
  });
});

describe('Frontend Auth Flow - Registration', () => {
  it('should display validation error when passwords do not match', async () => {
    renderWithRouterAndAuth(<RegisterPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign Up/i })).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText(/Your Name/i), { target: { value: 'Chiranjeevi' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'securePass123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'differentPass' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('should validate password length and complexity', async () => {
    renderWithRouterAndAuth(<RegisterPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign Up/i })).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText(/Your Name/i), { target: { value: 'Chiranjeevi' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'weak' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'weak' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });
});

describe('Frontend Protected Routing', () => {
  it('should redirect unauthenticated users to /login', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/Log in to continue building your streak/i)).toBeInTheDocument();
    });
  });
});
