import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  LOCAL_PLANNER_IMAGE_MAX_BYTES,
  acceptLocalPlannerImageForEdit,
  fileFromClipboardData,
  prepareLocalPlannerImageFile,
  validateLocalPlannerImageFile,
} from './localPlannerImageFile';

const compressPlannerImageFile = vi.hoisted(() => vi.fn((file: File) => Promise.resolve(file)));

vi.mock('./compressPlannerImageFile', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    compressPlannerImageFile,
  };
});

function file(type: string, size: number): File {
  const bytes = new Uint8Array(size);
  return new File([bytes], 'photo.bin', { type });
}

describe('acceptLocalPlannerImageForEdit', () => {
  it('accepts a jpeg larger than the upload limit so it can be cropped then compressed', () => {
    expect(
      acceptLocalPlannerImageForEdit(file('image/jpeg', LOCAL_PLANNER_IMAGE_MAX_BYTES + 1))
    ).toEqual({ ok: true });
  });
});

describe('validateLocalPlannerImageFile', () => {
  it('accepts jpeg within the size limit', () => {
    expect(validateLocalPlannerImageFile(file('image/jpeg', 12))).toEqual({ ok: true });
  });

  it('rejects svg and oversized files', () => {
    expect(validateLocalPlannerImageFile(file('image/svg+xml', 12))).toEqual({
      ok: false,
      reason: 'type',
    });
    expect(
      validateLocalPlannerImageFile(file('image/png', LOCAL_PLANNER_IMAGE_MAX_BYTES + 1))
    ).toEqual({ ok: false, reason: 'size' });
  });
});

describe('prepareLocalPlannerImageFile', () => {
  beforeEach(() => {
    compressPlannerImageFile.mockReset();
    compressPlannerImageFile.mockImplementation((file: File) => Promise.resolve(file));
  });

  it('rejects unsupported types before compression', async () => {
    await expect(prepareLocalPlannerImageFile(file('image/svg+xml', 12))).resolves.toEqual({
      ok: false,
      reason: 'type',
    });
    expect(compressPlannerImageFile).not.toHaveBeenCalled();
  });

  it('rejects empty files', async () => {
    await expect(prepareLocalPlannerImageFile(file('image/jpeg', 0))).resolves.toEqual({
      ok: false,
      reason: 'size',
    });
    expect(compressPlannerImageFile).not.toHaveBeenCalled();
  });

  it('accepts a jpeg that stays within the limit after compression', async () => {
    const original = file('image/jpeg', 12);
    await expect(prepareLocalPlannerImageFile(original)).resolves.toEqual({
      file: original,
      ok: true,
    });
    expect(compressPlannerImageFile).toHaveBeenCalledWith(original);
  });

  it('accepts a large photo when compression brings it under the limit', async () => {
    const original = file('image/jpeg', LOCAL_PLANNER_IMAGE_MAX_BYTES + 1);
    const compressed = file('image/jpeg', 12);
    compressPlannerImageFile.mockResolvedValueOnce(compressed);
    await expect(prepareLocalPlannerImageFile(original)).resolves.toEqual({
      file: compressed,
      ok: true,
    });
  });

  it('rejects files that remain too large after compression', async () => {
    compressPlannerImageFile.mockResolvedValueOnce(file('image/png', LOCAL_PLANNER_IMAGE_MAX_BYTES + 1));
    await expect(prepareLocalPlannerImageFile(file('image/png', 12))).resolves.toEqual({
      ok: false,
      reason: 'size',
    });
  });
});

describe('fileFromClipboardData', () => {
  it('returns the first image file from clipboard items', () => {
    const image = file('image/png', 8);
    const data = {
      files: [],
      items: [
        {
          getAsFile: () => image,
          kind: 'file',
          type: 'image/png',
        },
      ],
    } as unknown as DataTransfer;
    expect(fileFromClipboardData(data)).toBe(image);
  });

  it('falls back to clipboard files and ignores non-images', () => {
    const image = file('image/jpeg', 8);
    const data = {
      files: [file('text/plain', 4), image],
      items: [],
    } as unknown as DataTransfer;
    expect(fileFromClipboardData(data)).toBe(image);
    expect(fileFromClipboardData(null)).toBeNull();
  });
});
