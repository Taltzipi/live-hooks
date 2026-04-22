import { renderHook, act } from '@testing-library/react';
import { useLiveDebounce, useCancelableLiveDebounce } from '../src/useLiveDebounce';

describe('useLiveDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not fire immediately', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useLiveDebounce(fn, 100));

    act(() => {
      result.current('arg');
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('fires once after the delay', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useLiveDebounce(fn, 100));

    act(() => {
      result.current('arg');
      jest.advanceTimersByTime(100);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('arg');
  });

  it('debounces rapid calls — only the last one executes', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useLiveDebounce(fn, 100));

    act(() => {
      result.current('first');
      result.current('second');
      result.current('third');
      jest.advanceTimersByTime(100);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
  });

  it('resets the timer on each call', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useLiveDebounce(fn, 100));

    act(() => {
      result.current();
      jest.advanceTimersByTime(80);
      result.current();
      jest.advanceTimersByTime(80);
    });
    expect(fn).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('clears the pending timer on unmount', () => {
    const fn = jest.fn();
    const { result, unmount } = renderHook(() => useLiveDebounce(fn, 100));

    act(() => {
      result.current();
    });
    unmount();
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('useCancelableLiveDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('cancel() prevents the pending call from firing', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useCancelableLiveDebounce(fn, 100));
    const [debounced, cancel] = result.current;

    act(() => {
      debounced();
      cancel();
      jest.advanceTimersByTime(200);
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('fires normally when not cancelled', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useCancelableLiveDebounce(fn, 100));
    const [debounced] = result.current;

    act(() => {
      debounced('hello');
      jest.advanceTimersByTime(100);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('hello');
  });

  it('once: true — repeat calls while timer is pending are ignored', () => {
    const fn = jest.fn();
    const { result } = renderHook(() =>
      useCancelableLiveDebounce(fn, 100, { once: true })
    );
    const [debounced] = result.current;

    act(() => {
      debounced('first');
      debounced('second');
      debounced('third');
      jest.advanceTimersByTime(100);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('first');
  });

  it('once: true — allows a new call after the timer fires', () => {
    const fn = jest.fn();
    const { result } = renderHook(() =>
      useCancelableLiveDebounce(fn, 100, { once: true })
    );
    const [debounced] = result.current;

    act(() => {
      debounced('first');
      jest.advanceTimersByTime(100);
    });
    act(() => {
      debounced('second');
      jest.advanceTimersByTime(100);
    });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'first');
    expect(fn).toHaveBeenNthCalledWith(2, 'second');
  });
});
