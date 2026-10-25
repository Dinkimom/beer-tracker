import { beforeEach, describe, expect, it, vi } from 'vitest';

import { insertSprintComment } from '@/lib/sprints/sprintCommentsRepository';
import { deletePendingPlanPatchSprintComments } from '@/lib/sprints/sprintPendingCommentsRepository';

import { persistProposedCreateNotes } from './sprintPlanPatchDraftNotes';

vi.mock('@/lib/sprints/sprintCommentReplacements', () => ({
  insertPendingCommentReplacements: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/lib/sprints/sprintCommentsRepository', () => ({
  insertSprintComment: vi.fn(),
}));

vi.mock('@/lib/sprints/sprintPendingCommentsRepository', () => ({
  confirmPendingSprintComments: vi.fn(),
  deletePendingPlanPatchSprintComments: vi.fn(),
}));

const clearPending = vi.mocked(deletePendingPlanPatchSprintComments);
const insert = vi.mocked(insertSprintComment);

describe('persistProposedCreateNotes', () => {
  beforeEach(() => {
    clearPending.mockReset();
    insert.mockReset();
    clearPending.mockResolvedValue(2);
    insert.mockResolvedValue({});
  });

  it('clears all pending plan-patch notes before writing a revised createNote set', async () => {
    const ids = await persistProposedCreateNotes({
      actorUserId: '11111111-1111-4111-8111-111111111111',
      clientBrand: 'cursor',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      ops: [
        {
          assigneeId: 'staff:a',
          day: 0,
          op: 'createNote',
          part: 0,
          text: 'Revised',
        },
      ],
      organizationId: 'org',
      proposalId: 'new-ops-hash',
      sprintId: 42,
    });

    // Драфты приватны: снимаем только свои прошлые черновые заметки.
    expect(clearPending).toHaveBeenCalledWith({
      ownerId: '11111111-1111-4111-8111-111111111111',
      sprintId: 42,
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        clientBrand: 'cursor',
        planPatchProposalId: 'new-ops-hash',
        text: 'Revised',
      })
    );
    expect(ids).toHaveLength(1);
  });

  it('still clears previous drafts when the new propose has no createNote ops', async () => {
    const ids = await persistProposedCreateNotes({
      actorUserId: '11111111-1111-4111-8111-111111111111',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      ops: [
        {
          assigneeId: 'staff:a',
          duration: 1,
          op: 'upsertPosition',
          startDay: 0,
          startPart: 0,
          taskId: 'T-1',
        },
      ],
      organizationId: 'org',
      proposalId: 'positions-only',
      sprintId: 7,
    });

    expect(clearPending).toHaveBeenCalledWith({
      ownerId: '11111111-1111-4111-8111-111111111111',
      sprintId: 7,
    });
    expect(insert).not.toHaveBeenCalled();
    expect(ids).toEqual([]);
  });
});
