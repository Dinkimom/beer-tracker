/** @vitest-environment jsdom */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExcalidrawMark } from './ExcalidrawMark';

describe('ExcalidrawMark', () => {
  it('keeps the official purple fill by default', () => {
    const { container } = render(<ExcalidrawMark className="h-4 w-4" />);
    expect(container.querySelector('path')?.getAttribute('fill')).toBe('#6965DB');
  });

  it('follows currentColor when the picker should stay quiet', () => {
    const { container } = render(<ExcalidrawMark className="h-4 w-4" tone="inherit" />);
    expect(container.querySelector('path')?.getAttribute('fill')).toBe('currentColor');
  });
});
