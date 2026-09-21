import { describe, expect, it } from 'vitest';

import { intersectParticipantsColumnResizeGeometry } from './participantsColumnResizeGeometry';

describe('intersectParticipantsColumnResizeGeometry', () => {
  it('uses content height when content is shorter than the scrollport', () => {
    expect(
      intersectParticipantsColumnResizeGeometry(
        { left: 10, top: 100, bottom: 800 },
        100,
        280
      )
    ).toEqual({ left: 10, top: 100, height: 180 });
  });

  it('clips to the scrollport when content is taller', () => {
    expect(
      intersectParticipantsColumnResizeGeometry(
        { left: 0, top: 80, bottom: 600 },
        40,
        1200
      )
    ).toEqual({ left: 0, top: 80, height: 520 });
  });

  it('returns zero height when content is outside the scrollport', () => {
    expect(
      intersectParticipantsColumnResizeGeometry(
        { left: 0, top: 100, bottom: 500 },
        600,
        800
      )
    ).toEqual({ left: 0, top: 600, height: 0 });
  });
});
