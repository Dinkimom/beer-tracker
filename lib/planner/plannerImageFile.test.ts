import { describe, expect, it } from 'vitest';

import { validatePlannerImageBytes } from './plannerImageFile';

function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

describe('plannerImageFile', () => {
  it('accepts jpeg png gif and webp signatures', () => {
    expect(validatePlannerImageBytes(bytes(0xff, 0xd8, 0xff, 0x00))).toEqual({
      contentType: 'image/jpeg',
      ok: true,
    });
    expect(validatePlannerImageBytes(bytes(0x89, 0x50, 0x4e, 0x47))).toEqual({
      contentType: 'image/png',
      ok: true,
    });
    expect(validatePlannerImageBytes(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toEqual({
      contentType: 'image/gif',
      ok: true,
    });
    expect(
      validatePlannerImageBytes(
        bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)
      )
    ).toEqual({
      contentType: 'image/webp',
      ok: true,
    });
  });

  it('rejects empty buffers and mismatched declarations', () => {
    expect(validatePlannerImageBytes(bytes())).toEqual({ ok: false, reason: 'size' });
    expect(validatePlannerImageBytes(bytes(0xff, 0xd8, 0xff), 'image/png')).toEqual({
      ok: false,
      reason: 'type',
    });
    expect(validatePlannerImageBytes(bytes(0xff, 0xd8, 0xff), 'image/jpeg')).toEqual({
      contentType: 'image/jpeg',
      ok: true,
    });
  });
});
