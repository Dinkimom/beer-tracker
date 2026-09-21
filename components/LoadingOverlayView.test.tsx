/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { loadingOverlayLabel, LoadingOverlayView } from './LoadingOverlayView';

vi.mock('./BeerLottie', () => ({
  BeerLottie: () => <div data-testid="beer-lottie" />,
}));

describe('loadingOverlayLabel', () => {
  it('strips ASCII trailing dots', () => {
    expect(loadingOverlayLabel('Загрузка...')).toBe('Загрузка');
    expect(loadingOverlayLabel('Loading...')).toBe('Loading');
  });

  it('strips a unicode ellipsis', () => {
    expect(loadingOverlayLabel('Загрузка…')).toBe('Загрузка');
  });
});

describe('LoadingOverlayView', () => {
  it('keeps the full message for assistive tech and animates trailing dots', () => {
    render(<LoadingOverlayView message="Загрузка..." />);

    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Загрузка...');
    expect(screen.getByRole('status').className).toContain('bg-white');
    expect(screen.getByRole('status').className).not.toContain('backdrop-blur');
    expect(screen.getByText('Загрузка').textContent).toBe('Загрузка');
    expect(document.querySelector('.loading-overlay-dots__seq')?.children).toHaveLength(3);
  });
});
