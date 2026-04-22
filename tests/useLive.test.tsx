import { renderHook } from '@testing-library/react';
import { useLive } from '../src/useLive';

describe('useLive', () => {
  it('returns the latest primitive value after re-render', () => {
    let count = 0;
    const { result, rerender } = renderHook(() => useLive({ count }));
    expect(result.current.count).toBe(0);

    count = 42;
    rerender();
    expect(result.current.count).toBe(42);
  });

  it('calls the latest function (stale-closure guard)', () => {
    let multiplier = 2;
    const { result, rerender } = renderHook(
      ({ m }) => useLive({ double: (x: number) => x * m }),
      { initialProps: { m: multiplier } }
    );

    expect(result.current.double(5)).toBe(10);

    rerender({ m: 3 });
    expect(result.current.double(5)).toBe(15);
  });

  it('exposes a stable function wrapper identity across renders', () => {
    const { result, rerender } = renderHook(
      ({ fn }: { fn: () => number }) => useLive({ fn }),
      { initialProps: { fn: () => 1 } }
    );
    const first = result.current.fn;

    // Rerender with a new function — proxy recreates, but wrapper is cached
    rerender({ fn: () => 2 });
    expect(result.current.fn).toBe(first);
  });

  it('recreates the proxy when contents change (React Compiler compatibility)', () => {
    const { result, rerender } = renderHook(
      ({ n }) => useLive({ n }),
      { initialProps: { n: 1 as number } }
    );
    const proxy1 = result.current;

    rerender({ n: 2 });
    expect(result.current).not.toBe(proxy1);
  });

  it('keeps the same proxy identity when contents are unchanged', () => {
    const { result, rerender } = renderHook(
      ({ n }) => useLive({ n }),
      { initialProps: { n: 1 as number } }
    );
    const proxy1 = result.current;

    rerender({ n: 1 });
    expect(result.current).toBe(proxy1);
  });

  it('reflects Object.keys of the current object', () => {
    const { result, rerender } = renderHook(
      ({ obj }) => useLive(obj),
      { initialProps: { obj: { a: 1 } as Record<string, number> } }
    );
    expect(Object.keys(result.current)).toEqual(['a']);

    rerender({ obj: { a: 1, b: 2 } });
    expect(Object.keys(result.current)).toEqual(['a', 'b']);
  });
});
