import { describe, expect, it } from 'vitest';

import {
  isIgnorableConcurrentIndexError,
  plannerFilesNeedsStorageKey,
  shouldWipePlannerFilesForS3Migration,
} from './plannerFilesS3Migration';

describe('plannerFilesS3Migration', () => {
  it('wipes only while the BYTEA data column is still present', () => {
    expect(shouldWipePlannerFilesForS3Migration(['id', 'data', 'byte_size'])).toBe(true);
    expect(shouldWipePlannerFilesForS3Migration(['id', 'storage_key', 'byte_size'])).toBe(false);
    expect(shouldWipePlannerFilesForS3Migration([])).toBe(false);
  });

  it('adds storage_key when the column is missing', () => {
    expect(plannerFilesNeedsStorageKey(['id', 'data'])).toBe(true);
    expect(plannerFilesNeedsStorageKey(['id', 'storage_key'])).toBe(false);
  });

  it('ignores concurrent unique-index creation errors', () => {
    expect(isIgnorableConcurrentIndexError({ code: '42P07' })).toBe(true);
    expect(
      isIgnorableConcurrentIndexError({
        code: '23505',
        detail: 'Key (relname, relnamespace)=(idx_planner_files_storage_key, 1) already exists.',
      })
    ).toBe(true);
    expect(isIgnorableConcurrentIndexError({ code: '23505', detail: 'Key (storage_key)=(x)' })).toBe(
      false
    );
  });
});
