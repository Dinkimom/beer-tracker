import { describe, expect, it } from 'vitest';

import {
  computePlannerScrollOffsetsForElement,
  resolvePlannerTaskHtmlAnchorId,
} from '@/features/sprint/hooks/plannerFocusTaskHelpers';

describe('plannerFocusTaskHelpers', () => {
  it('resolvePlannerTaskHtmlAnchorId uses first plan segment anchor', () => {
    expect(resolvePlannerTaskHtmlAnchorId('comment:abc')).toBe('task-comment:abc');
    expect(resolvePlannerTaskHtmlAnchorId('DEV-1')).toBe('task-DEV-1');
  });

  it('computePlannerScrollOffsetsForElement centers element in container', () => {
    const container = {
      clientWidth: 400,
      clientHeight: 300,
      scrollLeft: 0,
      scrollTop: 0,
      scrollWidth: 1000,
      scrollHeight: 800,
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 300,
        right: 400,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as HTMLDivElement;

    const element = {
      getBoundingClientRect: () => ({
        left: 500,
        top: 200,
        width: 100,
        height: 56,
        right: 600,
        bottom: 256,
        x: 500,
        y: 200,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    expect(computePlannerScrollOffsetsForElement(container, element)).toEqual({
      scrollLeft: 350,
      scrollTop: 78,
    });
  });
});
