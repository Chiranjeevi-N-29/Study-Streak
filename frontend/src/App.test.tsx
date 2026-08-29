import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App.js';

describe('App component routing smoke test', () => {
  it('should redirect unauthenticated users to the Login view', async () => {
    render(<App />);
    await waitFor(() => {
      const heading = screen.getByText(/Welcome Back/i);
      expect(heading).toBeInTheDocument();
    });
  });
});
