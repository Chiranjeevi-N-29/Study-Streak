import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.js';

describe('App component placeholder', () => {
  it('should render the Get started header', () => {
    render(<App />);
    const heading = screen.getByText(/Get started/i);
    expect(heading).toBeInTheDocument();
  });
});
