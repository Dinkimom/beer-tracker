/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  ReleaseHoroscopeZodiacIcon,
  type ReleaseHoroscopeZodiacIconRef,
} from './ReleaseHoroscopeZodiacIcon';

const { goToAndPlay } = vi.hoisted(() => ({ goToAndPlay: vi.fn() }));

vi.mock('lottie-react', () => ({
  default: ({
    autoplay,
    loop,
    lottieRef,
  }: {
    autoplay?: boolean;
    loop?: boolean;
    lottieRef?: { current: { goToAndPlay: typeof goToAndPlay } | null };
  }) => {
    if (lottieRef) {
      lottieRef.current = { goToAndPlay };
    }
    return (
      <div
        data-autoplay={String(Boolean(autoplay))}
        data-loop={String(Boolean(loop))}
        data-testid="zodiac-lottie"
      />
    );
  },
}));

describe('ReleaseHoroscopeZodiacIcon', () => {
  it('stays on the first frame until play()', async () => {
    const ref = createRef<ReleaseHoroscopeZodiacIconRef>();
    render(<ReleaseHoroscopeZodiacIcon ref={ref} signId="sagittarius" />);

    const icon = await screen.findByTestId('zodiac-lottie');
    expect(icon.getAttribute('data-autoplay')).toBe('false');
    expect(icon.getAttribute('data-loop')).toBe('false');

    ref.current?.play();
    expect(goToAndPlay).toHaveBeenCalledWith(0, true);
  });
});
