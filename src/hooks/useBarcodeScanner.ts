import { useEffect, useRef } from 'react';

export type UseBarcodeScannerOptions = {
  onScan: (code: string) => void;
  // Minimum length to consider input a scan
  minLength?: number; // default 6
  // Max millis between keystrokes to be considered one scan burst
  maxInterval?: number; // default 50ms
  // Whether to capture when typing inside inputs/textareas/selects
  captureOnInputs?: boolean; // default false
};

// Detects keyboard-wedge barcode scans (scanners that type characters then send Enter)
export default function useBarcodeScanner(options: UseBarcodeScannerOptions) {
  const { onScan, minLength = 6, maxInterval = 50, captureOnInputs = false } = options;
  const bufferRef = useRef('');
  const lastTimeRef = useRef(0);
  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearBuffer = () => {
      bufferRef.current = '';
      lastTimeRef.current = 0;
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
    };

    const scheduleClear = () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = window.setTimeout(clearBuffer, 300); // idle timeout
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as any).isContentEditable
      );
      if (isEditable && !captureOnInputs) {
        // Let normal typing in inputs happen
        return;
      }

      const now = Date.now();
      const timeDiff = now - (lastTimeRef.current || 0);

      if (timeDiff > maxInterval) {
        // Too slow -> start a new potential scan
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        // End of scan sent
        if (bufferRef.current.length >= minLength) {
          const code = bufferRef.current;
          clearBuffer();
          try { onScan(code); } catch { /* noop */ }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        // Not a scan, reset
        clearBuffer();
        return;
      }

      // Accept only visible single characters (ignore control keys)
      if (e.key.length === 1) {
        bufferRef.current += e.key;
        lastTimeRef.current = now;
        scheduleClear();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    };
  }, [onScan, minLength, maxInterval, captureOnInputs]);
}
