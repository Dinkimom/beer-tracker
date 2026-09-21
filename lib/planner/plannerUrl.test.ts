import { describe, expect, it } from 'vitest';

import {
  appendPlannerFocusTaskQuery,
  buildPlannerPath,
  isPlannerPath,
  parsePlannerPath,
  readPlannerFocusTaskFromSearchParams,
  stripPlannerFocusTaskFromHref,
} from './plannerUrl';

describe('plannerUrl', () => {
  it('buildPlannerPath', () => {
    expect(buildPlannerPath(12, 34)).toBe('/planner/12/sprint/34');
  });

  it('appendPlannerFocusTaskQuery', () => {
    expect(appendPlannerFocusTaskQuery('/planner/12/sprint/34', 'comment:abc')).toBe(
      '/planner/12/sprint/34?focusTask=comment%3Aabc'
    );
  });

  it('readPlannerFocusTaskFromSearchParams', () => {
    const params = new URLSearchParams('page=sprints&focusTask=DEV-1');
    expect(readPlannerFocusTaskFromSearchParams(params)).toBe('DEV-1');
  });

  it('stripPlannerFocusTaskFromHref preserves other query params', () => {
    const params = new URLSearchParams('page=sprints&tab=board&focusTask=DEV-1');
    expect(stripPlannerFocusTaskFromHref('/planner/1/sprint/2', params)).toBe(
      '/planner/1/sprint/2?page=sprints&tab=board'
    );
  });

  it('parsePlannerPath', () => {
    expect(parsePlannerPath('/planner/12/sprint/34')).toEqual({ boardId: 12, sprintId: 34 });
    expect(parsePlannerPath('/planner/12/sprint/34/extra')).toEqual({ boardId: 12, sprintId: 34 });
    expect(parsePlannerPath('/')).toBeNull();
  });

  it('isPlannerPath', () => {
    expect(isPlannerPath('/planner/1/sprint/2')).toBe(true);
    expect(isPlannerPath('/')).toBe(false);
  });
});
