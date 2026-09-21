import { describe, expect, it } from 'vitest';

import {
  clampParticipantsColumnWidth,
  PARTICIPANTS_COLUMN_MAX_WIDTH,
  PARTICIPANTS_COLUMN_MIN_WIDTH,
} from './participantsColumnWidth';

describe('clampParticipantsColumnWidth', () => {
  it('clamps below the minimum', () => {
    expect(clampParticipantsColumnWidth(PARTICIPANTS_COLUMN_MIN_WIDTH - 40)).toBe(
      PARTICIPANTS_COLUMN_MIN_WIDTH
    );
  });

  it('clamps above the maximum', () => {
    expect(clampParticipantsColumnWidth(PARTICIPANTS_COLUMN_MAX_WIDTH + 80)).toBe(
      PARTICIPANTS_COLUMN_MAX_WIDTH
    );
  });

  it('keeps values inside the range', () => {
    expect(clampParticipantsColumnWidth(280)).toBe(280);
  });
});
