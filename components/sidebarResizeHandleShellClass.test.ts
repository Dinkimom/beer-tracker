import { describe, expect, it } from 'vitest';

import { ZIndex } from '@/constants';

import {
  sidebarResizeHandleShellClass,
  sidebarResizeSidePositionClass,
} from './sidebarResizeHandleShellClass';

describe('sidebarResizeHandleShellClass', () => {
  it('keeps the default planner handle geometry', () => {
    const className = sidebarResizeHandleShellClass({
      fixedIconInViewport: false,
      isResizing: false,
      positionClass: sidebarResizeSidePositionClass('left'),
    });

    expect(className).toContain('left-0');
    expect(className).toContain('w-1.5');
    expect(className).toContain(ZIndex.class('stickyElevated'));
    expect(className).not.toContain('-left-1.5');
  });

  it('allows portal sidebars to widen the hit area without changing defaults', () => {
    const className = sidebarResizeHandleShellClass({
      fixedIconInViewport: false,
      isResizing: false,
      positionClass: 'left-0',
      widthClass: 'w-3',
      zIndexClass: ZIndex.class('sidebarResize'),
    });

    expect(className).toContain('w-3');
    expect(className).toContain(ZIndex.class('sidebarResize'));
  });
});
