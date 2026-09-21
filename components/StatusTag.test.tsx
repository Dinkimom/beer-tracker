/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusTag } from './StatusTag';

describe('StatusTag', () => {
  it('uses statusColorKey for palette like TaskCard', () => {
    render(<StatusTag label="С override" status="inprogress" statusColorKey="closed" />);
    const el = screen.getByText('С override');
    expect(el.className).toContain('bg-green-100');
  });

  it('falls back to status when statusColorKey is absent', () => {
    render(<StatusTag label="Без override" status="inprogress" />);
    const el = screen.getByText('Без override');
    expect(el.className).toContain('bg-blue-100');
  });

  it('shows the tracker status string as-is when label is absent', () => {
    render(<StatusTag status="Code review" />);
    expect(screen.getByText('Code review')).toBeTruthy();
    expect(screen.queryByText('На ревью')).toBeNull();
  });
});
