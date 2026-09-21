import { describe, expect, it } from 'vitest';

import {
  buildCloseP4ApprovalComment,
  mergeTrackerTags,
  resolveCloseP4DecisionState,
  resolveCloseP4Tag,
} from './closeP4Actions';

describe('closeP4Actions', () => {
  it('mergeTrackerTags keeps existing tags and adds a new one', () => {
    expect(mergeTrackerTags(['bug_in_progress', 'key_client'], 'closing_candidate')).toEqual([
      'bug_in_progress',
      'key_client',
      'closing_candidate',
    ]);
  });

  it('mergeTrackerTags does not duplicate tags', () => {
    expect(mergeTrackerTags(['closing_candidate'], 'closing_candidate')).toEqual([
      'closing_candidate',
    ]);
  });

  it('resolveCloseP4DecisionState reads closing_candidate and bug_in_progress', () => {
    expect(resolveCloseP4DecisionState(['closing_candidate'])).toBe('on_approval');
    expect(resolveCloseP4DecisionState(['bug_in_progress'])).toBe('kept');
    expect(resolveCloseP4DecisionState(['other'])).toBeNull();
    expect(
      resolveCloseP4DecisionState(['bug_in_progress', 'closing_candidate'])
    ).toBe('on_approval');
  });

  it('resolveCloseP4Tag maps actions to tracker tags', () => {
    expect(resolveCloseP4Tag('send_for_approval')).toBe('closing_candidate');
    expect(resolveCloseP4Tag('keep')).toBe('bug_in_progress');
  });

  it('buildCloseP4ApprovalComment formats days and last HD date', () => {
    const nowMs = Date.parse('2026-06-23T12:00:00.000Z');
    const lastHdAt = '2026-05-24T10:00:00.000Z';
    const comment = buildCloseP4ApprovalComment(
      { createdAt: '2026-01-01T00:00:00.000Z', hdCount: 3, lastHdAt },
      nowMs
    );

    expect(comment).toContain('30 дней');
    expect(comment).toContain('мая 2026');
    expect(comment).not.toContain('"');
    expect(comment).toContain('Последнее обращение было');
    expect(comment).toContain('Запрашиваем визу на закрытие задачи');
  });
});
