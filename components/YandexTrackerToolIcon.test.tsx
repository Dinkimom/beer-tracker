/** @vitest-environment jsdom */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { YandexTrackerToolIcon } from './YandexTrackerToolIcon';

describe('YandexTrackerToolIcon', () => {
  it('draws the Tracker T as five currentColor squares', () => {
    const { container } = render(<YandexTrackerToolIcon className="h-4 w-4" />);
    const squares = container.querySelectorAll('rect');
    expect(squares).toHaveLength(5);
    expect(container.querySelector('svg')?.getAttribute('fill')).toBe('currentColor');
  });
});
