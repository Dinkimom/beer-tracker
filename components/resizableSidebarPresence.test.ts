import { describe, expect, it } from 'vitest';

import {
  isResizableSidebarWidthTransitionFinished,
  nextResizableSidebarPhase,
  resizableSidebarShellWidthPx,
} from './resizableSidebarPresence';

describe('nextResizableSidebarPhase', () => {
  it('opens with an entering phase unless motion is skipped', () => {
    expect(nextResizableSidebarPhase(true, 'closed', false, false)).toBe('entering');
    expect(nextResizableSidebarPhase(true, 'closed', true, false)).toBe('open');
    expect(nextResizableSidebarPhase(true, 'closed', false, true)).toBe('open');
  });

  it('cancels exit when opened again', () => {
    expect(nextResizableSidebarPhase(true, 'exiting', false, false)).toBe('open');
  });

  it('starts exit from open or entering', () => {
    expect(nextResizableSidebarPhase(false, 'open', false, false)).toBe('exiting');
    expect(nextResizableSidebarPhase(false, 'entering', false, false)).toBe('exiting');
  });

  it('closes immediately when motion is reduced or instant', () => {
    expect(nextResizableSidebarPhase(false, 'open', true, false)).toBe('closed');
    expect(nextResizableSidebarPhase(false, 'open', false, true)).toBe('closed');
  });
});

describe('resizableSidebarShellWidthPx', () => {
  it('uses the target width only while fully open', () => {
    expect(resizableSidebarShellWidthPx('open', 360)).toBe(360);
    expect(resizableSidebarShellWidthPx('entering', 360)).toBe(0);
    expect(resizableSidebarShellWidthPx('exiting', 360)).toBe(0);
    expect(resizableSidebarShellWidthPx('closed', 360)).toBe(0);
  });
});

describe('isResizableSidebarWidthTransitionFinished', () => {
  const panel = {} as EventTarget;
  const child = {} as EventTarget;

  it('accepts the shell width transition while exiting', () => {
    expect(isResizableSidebarWidthTransitionFinished('width', panel, panel, 'exiting')).toBe(true);
  });

  it('ignores nested targets and other properties', () => {
    expect(isResizableSidebarWidthTransitionFinished('width', child, panel, 'exiting')).toBe(false);
    expect(isResizableSidebarWidthTransitionFinished('opacity', panel, panel, 'exiting')).toBe(false);
    expect(isResizableSidebarWidthTransitionFinished('width', panel, panel, 'open')).toBe(false);
  });
});
