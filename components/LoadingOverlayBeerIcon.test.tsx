/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoadingOverlayBeerIcon } from './LoadingOverlayBeerIcon';

vi.mock('./BeerLottie', () => ({
  BeerLottie: ({ autoplay, loop }: { autoplay?: boolean; loop?: boolean }) => (
    <div data-autoplay={String(Boolean(autoplay))} data-loop={String(Boolean(loop))} data-testid="beer-lottie" />
  ),
}));

describe('LoadingOverlayBeerIcon', () => {
  it('plays the logo beer emoji in a loop without spinning it', () => {
    render(<LoadingOverlayBeerIcon />);
    const beer = screen.getByTestId('beer-lottie');
    expect(beer.getAttribute('data-autoplay')).toBe('true');
    expect(beer.getAttribute('data-loop')).toBe('true');
  });
});
