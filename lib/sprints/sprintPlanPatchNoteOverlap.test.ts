import type { SprintContextNote } from '@/lib/sprints/sprintContextTypes';

import { describe, expect, it } from 'vitest';

import { collectNoteOverlapWarnings } from './sprintPlanPatchNoteOverlap';

function note(overrides: Partial<SprintContextNote>): SprintContextNote {
  return {
    assigneeId: 'staff:a',
    authorName: null,
    day: 0,
    height: 1,
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'text',
    part: 0,
    text: 'Existing',
    width: 2,
    ...overrides,
  };
}

const base = { dayCount: 5, partsPerDay: 3 };

describe('collectNoteOverlapWarnings', () => {
  it('warns when a created note overlaps a note of the same assignee and names a free slot', () => {
    const warnings = collectNoteOverlapWarnings({
      ...base,
      notes: [note({ day: 3, part: 0 })],
      ops: [{ assigneeId: 'staff:a', day: 3, op: 'createNote', part: 1, text: 'RND-670 (2/3)' }],
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('note_overlap: "RND-670 (2/3)"');
    expect(warnings[0]).toContain('"Existing"');
    expect(warnings[0]).toContain('first free slot: day 3 part 2');
  });

  it('warns about two created notes that overlap each other', () => {
    const warnings = collectNoteOverlapWarnings({
      ...base,
      notes: [],
      ops: [
        { assigneeId: 'staff:a', day: 1, op: 'createNote', part: 0, text: 'one' },
        { assigneeId: 'staff:a', day: 1, op: 'createNote', part: 1, text: 'two' },
      ],
    });
    expect(warnings).toHaveLength(2);
  });

  it('ignores other assignees, adjacent notes and untouched overlaps', () => {
    const warnings = collectNoteOverlapWarnings({
      ...base,
      notes: [
        note({ day: 0, id: 'a', part: 0 }),
        note({ day: 0, id: 'b', part: 1 }),
        note({ assigneeId: 'staff:b', day: 2, id: 'c', part: 0 }),
      ],
      ops: [
        { assigneeId: 'staff:a', day: 2, op: 'createNote', part: 0, text: 'next to c' },
        { assigneeId: 'staff:a', day: 2, op: 'createNote', part: 2, text: 'adjacent', width: 1 },
      ],
    });
    expect(warnings).toEqual([]);
  });

  it('applies updateNote/deleteNote and skips own pending drafts', () => {
    const warnings = collectNoteOverlapWarnings({
      ...base,
      notes: [
        note({ day: 1, id: '22222222-2222-4222-8222-222222222222', part: 0 }),
        note({ day: 4, id: '33333333-3333-4333-8333-333333333333', part: 0, pendingApproval: true }),
        note({ day: 4, id: '44444444-4444-4444-8444-444444444444', part: 1 }),
      ],
      ops: [
        { commentId: '44444444-4444-4444-8444-444444444444', op: 'deleteNote' },
        {
          commentId: '22222222-2222-4222-8222-222222222222',
          day: 4,
          op: 'updateNote',
          part: 0,
        },
      ],
    });
    expect(warnings).toEqual([]);
  });

  it('says when no free slot is left', () => {
    const warnings = collectNoteOverlapWarnings({
      dayCount: 1,
      notes: [note({ day: 0, part: 0, width: 3 })],
      ops: [{ assigneeId: 'staff:a', day: 0, op: 'createNote', part: 0, text: 'late' }],
      partsPerDay: 3,
    });
    expect(warnings[0]).toContain('no free slot');
  });
});
