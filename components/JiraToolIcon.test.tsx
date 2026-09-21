/** @vitest-environment jsdom */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JiraToolIcon } from './JiraToolIcon';

describe('JiraToolIcon', () => {
  it('draws a diamond ring in currentColor with two overlap folds', () => {
    const { container } = render(<JiraToolIcon className="h-4 w-4" />);
    const svg = container.querySelector('svg');
    const paths = container.querySelectorAll('path');
    expect(svg?.getAttribute('fill')).toBe('currentColor');
    expect(paths).toHaveLength(3);
    expect(paths[0]?.getAttribute('fill-rule')).toBe('evenodd');
    expect(paths[1]?.getAttribute('opacity')).toBe('0.45');
    expect(paths[2]?.getAttribute('opacity')).toBe('0.45');
  });
});
