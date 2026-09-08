import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus.js';
import { usePWAInstall } from './usePWAInstall.js';
import { OfflineBanner } from './components/OfflineBanner.js';
import { PWAInstallPrompt } from './components/PWAInstallPrompt.js';
import { UpdateBanner } from './components/UpdateBanner.js';
import { registerServiceWorker } from './swRegister.js';

describe('PWA Suite & Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('useOnlineStatus hook', () => {
    it('should reflect initial online state and handle window online/offline events', () => {
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current.isOnline).toBe(true);

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });
      expect(result.current.isOnline).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);
    });
  });

  describe('OfflineBanner component', () => {
    it('should render offline banner when navigator is offline', () => {
      render(<OfflineBanner />);

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText("You're offline.")).toBeInTheDocument();
    });

    it('should show back online toast when connection recovers', () => {
      render(<OfflineBanner />);

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(screen.getByText('Back online.')).toBeInTheDocument();
    });
  });

  describe('usePWAInstall hook & PWAInstallPrompt component', () => {
    it('should handle beforeinstallprompt event and trigger prompt', async () => {
      const { result } = renderHook(() => usePWAInstall());

      const mockPromptEvent = new Event('beforeinstallprompt') as any;
      mockPromptEvent.prompt = vi.fn().mockResolvedValue(undefined);
      mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

      act(() => {
        window.dispatchEvent(mockPromptEvent);
      });

      expect(result.current.isInstallable).toBe(true);

      await act(async () => {
        await result.current.promptInstall();
      });

      expect(mockPromptEvent.prompt).toHaveBeenCalledTimes(1);
    });

    it('should allow dismissing install prompt and remember dismissal in sessionStorage', () => {
      const { result } = renderHook(() => usePWAInstall());

      const mockPromptEvent = new Event('beforeinstallprompt') as any;
      mockPromptEvent.prompt = vi.fn();
      mockPromptEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });

      act(() => {
        window.dispatchEvent(mockPromptEvent);
      });

      expect(result.current.isInstallable).toBe(true);

      act(() => {
        result.current.dismissInstall();
      });

      expect(result.current.isInstallable).toBe(false);
      expect(sessionStorage.getItem('studystreak_pwa_dismissed')).toBe('true');
    });

    it('should render PWAInstallPrompt component when installable', () => {
      render(<PWAInstallPrompt />);

      const mockPromptEvent = new Event('beforeinstallprompt') as any;
      mockPromptEvent.prompt = vi.fn();
      mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

      act(() => {
        window.dispatchEvent(mockPromptEvent);
      });

      expect(screen.getByText('Install StudyStreak')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Install App/i })).toBeInTheDocument();
    });
  });

  describe('UpdateBanner component', () => {
    it('should render update banner and trigger refresh callback', () => {
      const handleRefresh = vi.fn();
      render(<UpdateBanner onRefresh={handleRefresh} />);

      expect(screen.getByText('New Version Available!')).toBeInTheDocument();

      const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshBtn);

      expect(handleRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('swRegister helper', () => {
    it('should safely execute registerServiceWorker without crashing', () => {
      expect(() => registerServiceWorker()).not.toThrow();
    });
  });
});
