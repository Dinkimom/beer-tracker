/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { resolveFactBarFocusTaskId } from './swimlaneFactMarkerHelpers';
import { useCardShadowFactFocusTaskId } from './useCardShadowFactFocusTaskId';

describe('resolveFactBarFocusTaskId', () => {
  it('prefers the fact bar under the pointer', () => {
    expect(resolveFactBarFocusTaskId('fact', 'card')).toBe('fact');
  });

  it('uses the hovered card in the same moment as its shadow', () => {
    expect(resolveFactBarFocusTaskId(null, 'card')).toBe('card');
  });

  it('focuses nothing without either hover', () => {
    expect(resolveFactBarFocusTaskId(null, null)).toBeNull();
  });
});

describe('useCardShadowFactFocusTaskId', () => {
  it('focuses the card as soon as the pointer enters', () => {
    const { result } = renderHook(() => useCardShadowFactFocusTaskId());

    act(() => {
      result.current.syncCardShadowHover('task-a');
    });

    expect(result.current.cardShadowTaskId).toBe('task-a');
  });

  it('clears the focus as soon as the pointer leaves', () => {
    const { result } = renderHook(() => useCardShadowFactFocusTaskId());

    act(() => {
      result.current.syncCardShadowHover('task-a');
      result.current.syncCardShadowHover(null);
    });

    expect(result.current.cardShadowTaskId).toBeNull();
  });

  it('switches to the next card without a gap', () => {
    const { result } = renderHook(() => useCardShadowFactFocusTaskId());

    act(() => {
      result.current.syncCardShadowHover('task-a');
      result.current.syncCardShadowHover('task-b');
    });

    expect(result.current.cardShadowTaskId).toBe('task-b');
  });
});
