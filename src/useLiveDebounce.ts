import { useCallback, useEffect, useRef, useLayoutEffect } from 'react';

/**
 * useLiveDebounce
 * ---------------
 * Returns a debounced version of `fn` that waits `delay` ms after the last
 * call before executing. Always invokes the latest version of `fn` (no stale
 * closures). Pending timeout is cleared on unmount.
 *
 * @param fn    Function to debounce
 * @param delay Wait time in milliseconds
 */
export function useLiveDebounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestFnRef = useRef(fn);

  useLayoutEffect(() => {
    latestFnRef.current = fn;
  });

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        latestFnRef.current(...args);
      }, delay);
    },
    [delay]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return debounced;
}

/**
 * useCancelableLiveDebounce
 * -------------------------
 * Like `useLiveDebounce` but also returns a `cancel` function that clears
 * any pending timeout before it fires.
 *
 * @param fn      Function to debounce
 * @param delay   Wait time in milliseconds
 * @param options `once`: if true, repeat calls while a timer is pending are ignored
 *
 * @returns [debouncedFn, cancel]
 */
export function useCancelableLiveDebounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
  options?: { once?: boolean }
): [(...args: Parameters<T>) => void, () => void] {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestFnRef = useRef(fn);
  const once = options?.once ?? false;

  useLayoutEffect(() => {
    latestFnRef.current = fn;
  });

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (once && timerRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        latestFnRef.current(...args);
      }, delay);
    },
    [delay, once]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return [debounced, cancel];
}
