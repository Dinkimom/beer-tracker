/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './Input';

describe('Input', () => {
  it('sets aria-invalid when invalid', () => {
    render(<Input aria-label="Test field" invalid />);
    const el = screen.getByLabelText('Test field');
    expect(el.getAttribute('aria-invalid')).toBe('true');
    expect(el.className).toContain('border-red-500');
  });

  it('omits aria-invalid when not invalid', () => {
    render(<Input aria-label="Ok field" />);
    const el = screen.getByLabelText('Ok field');
    expect(el.getAttribute('aria-invalid')).toBeNull();
  });
});
