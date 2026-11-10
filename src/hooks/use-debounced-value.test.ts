import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes only the last value after the configured delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'bag' },
    });

    rerender({ value: 'bag-' });
    rerender({ value: 'bag-1' });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('bag');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('bag-1');
  });

  it('clears the pending timer when the hook unmounts', () => {
    vi.useFakeTimers();
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'initial' },
    });

    rerender({ value: 'pending' });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
