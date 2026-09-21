/** @vitest-environment jsdom */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SwimlanePlacementToolbarCursorIcon } from './SwimlanePlacementToolbarCursorIcon';

describe('SwimlanePlacementToolbarCursorIcon', () => {
  it('stays an outline until cursor mode is on', () => {
    const idle = render(<SwimlanePlacementToolbarCursorIcon />);
    expect(idle.container.querySelector('svg')?.getAttribute('fill')).toBe('none');
    const active = render(<SwimlanePlacementToolbarCursorIcon filled />);
    expect(active.container.querySelector('svg')?.getAttribute('fill')).toBe('currentColor');
  });
});
