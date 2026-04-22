import { renderHook } from '@testing-library/react';
import { useLiveCallback } from '../src/useLiveCallback';

describe('useLiveCallback', () => {
  it('returns a stable function identity across renders', () => {
    const fn1 = jest.fn(() => 'first');
    const fn2 = jest.fn(() => 'second');

    const { result, rerender } = renderHook(
      ({ fn }) => useLiveCallback(fn),
      { initialProps: { fn: fn1 } }
    );
    const stable = result.current;

    rerender({ fn: fn2 });
    expect(result.current).toBe(stable);
  });

  it('calls the latest provided function after rerender', () => {
    const fn1 = jest.fn(() => 'first');
    const fn2 = jest.fn(() => 'second');

    const { result, rerender } = renderHook(
      ({ fn }) => useLiveCallback(fn),
      { initialProps: { fn: fn1 } }
    );
    const stable = result.current;

    rerender({ fn: fn2 });
    const value = stable();

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(value).toBe('second');
  });

  it('forwards arguments correctly', () => {
    const fn = jest.fn((a: number, b: number) => a + b);
    const { result } = renderHook(() => useLiveCallback(fn));

    const sum = result.current(3, 4);
    expect(sum).toBe(7);
    expect(fn).toHaveBeenCalledWith(3, 4);
  });
});
