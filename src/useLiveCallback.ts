import { useRef, useMemo, useLayoutEffect } from 'react';

/**
 * useLiveCallback
 * ---------------
 * Returns a stable function reference that always calls the *latest* version
 * of the provided callback — without the stale-closure problem of useCallback.
 *
 * The returned function's identity never changes (safe as a dependency-free
 * event handler), but every call dispatches to the most-recently-rendered fn.
 */
export function useLiveCallback<T extends (...a: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useMemo(
    () => ((...args: Parameters<T>) => ref.current(...args)) as T,
    []
  );
}
