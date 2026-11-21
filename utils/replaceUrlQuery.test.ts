// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { replaceUrlQuery } from './replaceUrlQuery';

describe('replaceUrlQuery', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('две записи подряд не затирают друг друга', () => {
    window.history.replaceState(null, '', '/planner/1/sprint/2?sidebarTab=tasks#x');
    replaceUrlQuery((params) => params.set('sidebarTab', 'history'));
    replaceUrlQuery((params) => params.set('focusTask', 'DEMO-109'));
    expect(window.location.pathname).toBe('/planner/1/sprint/2');
    expect(window.location.search).toBe('?sidebarTab=history&focusTask=DEMO-109');
    expect(window.location.hash).toBe('#x');
  });

  it('пустой query — без «?»', () => {
    window.history.replaceState(null, '', '/planner?focusTask=A');
    replaceUrlQuery((params) => params.delete('focusTask'));
    expect(`${window.location.pathname}${window.location.search}`).toBe('/planner');
  });
});
