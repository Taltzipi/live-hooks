import { useRef } from 'react';

/**
 * useLive
 * -------
 * Returns a "live view" (Proxy) of an object whose shape stays the same,
 * but whose *contents* may change across renders (e.g., a hook result).
 *
 * - Reading a property (e.g., live.foo) pulls from the *latest* obj.
 * - Calling a method (e.g., live.inc()) invokes the *latest* function,
 *   not the one captured earlier by a stale closure.
 * - Method wrappers are cached so their identity is stable across renders.
 * - Keys/enumeration reflect the latest object (Object.keys, spread, etc.).
 *
 * Use for IMPERATIVE reads (event handlers, async flows). For rendering,
 * prefer normal React data flow (props/state) instead of live reads.
 */
export function useLive<T extends object>(obj: T): T {
  // Keep a mutable pointer to the most recent object, assigned synchronously
  // during render to avoid any post-effect staleness gap.
  const currentRef = useRef<T | null>(null);
  const prevRef = useRef<T | null>(null);

  prevRef.current = currentRef.current;
  currentRef.current = obj;

  // For React Compiler compatibility: recreate the proxy when contents change
  // so the compiler sees a referentially new value rather than treating it as
  // frozen. Not required for plain React, but costs almost nothing.
  const haveRefContentsChanged =
    !prevRef.current ||
    Object.keys(obj).length !== Object.keys(prevRef.current).length ||
    Object.keys(obj).some(
      (prop) => (obj as any)[prop] !== (prevRef.current as any)[prop]
    );

  // Cache per-property method wrappers so function identity is stable.
  // Stable identity avoids useless effect re-runs and child re-renders.
  const wrapperCacheRef = useRef(new Map<PropertyKey, Function>());

  const proxyRef = useRef<T | null>(null);
  if (!proxyRef.current || haveRefContentsChanged) {
    proxyRef.current = new Proxy({} as T, {
      get(_target, prop, _receiver) {
        const latest: any = currentRef.current;
        const value = latest[prop];

        if (typeof value !== 'function') return value;

        let wrapper = wrapperCacheRef.current.get(prop);
        if (!wrapper) {
          wrapper = (...args: any[]) => {
            const now: any = currentRef.current;
            const fn = now[prop];
            return typeof fn === 'function' ? fn.apply(now, args) : fn;
          };
          wrapperCacheRef.current.set(prop, wrapper);
        }
        return wrapper as any;
      },

      has(_target, prop) {
        return prop in currentRef.current!;
      },

      ownKeys() {
        return Reflect.ownKeys(currentRef.current!);
      },

      getOwnPropertyDescriptor(_target, prop) {
        return (
          Object.getOwnPropertyDescriptor(currentRef.current, prop) ?? {
            configurable: true,
            enumerable: true,
          }
        );
      },

      set(_target, prop, value) {
        (currentRef.current as any)[prop] = value;
        return true;
      },
    });
  }

  return proxyRef.current as T;
}
