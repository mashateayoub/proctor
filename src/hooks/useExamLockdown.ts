'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export interface LockdownViolation {
  type:
    | 'fullscreen_exit'
    | 'tab_switch'
    | 'copy'
    | 'paste'
    | 'cut'
    | 'right_click'
    | 'devtools'
    | 'print_screen';
  timestamp: number;
}

interface UseLockdownOptions {
  /** Whether lockdown is active (e.g. only during the exam). */
  enabled: boolean;
  /** Callback fired once per violation so the parent can persist it. */
  onViolation?: (v: LockdownViolation) => void;
}

/**
 * useExamLockdown
 * ───────────────
 * Enforces a strict exam environment:
 *  1. Requests Fullscreen API on mount and re-requests if the student exits.
 *  2. Blocks: copy, cut, paste, right-click, context menu, PrintScreen,
 *     DevTools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U).
 *  3. Detects visibility/focus loss (alt-tab, switching browser tabs).
 *
 * Every infraction is surfaced through `onViolation` so ProctorCamera
 * can log it to `cheating_logs`.
 */
export function useExamLockdown({ enabled, onViolation }: UseLockdownOptions) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [showWarning, setShowWarning] = useState<string | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────
  const emit = useCallback(
    (type: LockdownViolation['type']) => {
      const v: LockdownViolation = { type, timestamp: Date.now() };
      setViolationCount((c) => c + 1);
      onViolation?.(v);

      // Flash a warning banner for 3 s
      const labels: Record<string, string> = {
        fullscreen_exit: '⚠ Fullscreen exit detected — violation logged',
        tab_switch: '⚠ Tab / window switch detected — violation logged',
        copy: '⚠ Copy attempt blocked — violation logged',
        paste: '⚠ Paste attempt blocked — violation logged',
        cut: '⚠ Cut attempt blocked — violation logged',
        right_click: '⚠ Right-click blocked — violation logged',
        devtools: '⚠ DevTools shortcut blocked — violation logged',
        print_screen: '⚠ PrintScreen blocked — violation logged',
      };
      setShowWarning(labels[type] ?? '⚠ Violation logged');
      if (warningTimer.current) clearTimeout(warningTimer.current);
      warningTimer.current = setTimeout(() => setShowWarning(null), 3000);
    },
    [onViolation],
  );

  // ── Fullscreen request ───────────────────────────────────────────────────
  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // user gesture required – silently wait; we'll retry on interaction
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    requestFullscreen();
  }, [enabled, requestFullscreen]);

  // ── Fullscreen change listener ───────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleFSChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        emit('fullscreen_exit');
        // Re-request fullscreen after a tiny delay (browser requires it)
        setTimeout(requestFullscreen, 300);
      }
    };

    document.addEventListener('fullscreenchange', handleFSChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFSChange);
  }, [enabled, emit, requestFullscreen]);

  // ── Visibility / focus loss ──────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.hidden) emit('tab_switch');
    };
    const handleBlur = () => emit('tab_switch');

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, emit]);

  // ── Clipboard blocking ──────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const block = (e: ClipboardEvent) => {
      e.preventDefault();
      emit(e.type as 'copy' | 'cut' | 'paste');
    };

    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('paste', block);
    return () => {
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('paste', block);
    };
  }, [enabled, emit]);

  // ── Context menu (right-click) ──────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const block = (e: MouseEvent) => {
      e.preventDefault();
      emit('right_click');
    };

    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, [enabled, emit]);

  // ── Keyboard shortcuts (DevTools, PrintScreen) ──────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const block = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        emit('devtools');
        return;
      }
      // Ctrl+Shift+I / J / C  (Chrome DevTools)
      if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        emit('devtools');
        return;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        emit('devtools');
        return;
      }
      // PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        emit('print_screen');
        return;
      }
      // Ctrl+P (Print)
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        emit('devtools');
        return;
      }
    };

    document.addEventListener('keydown', block, { capture: true });
    return () => document.removeEventListener('keydown', block, { capture: true });
  }, [enabled, emit]);

  return {
    isFullscreen,
    violationCount,
    showWarning,
    requestFullscreen,
  };
}
