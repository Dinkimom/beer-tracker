import { beforeEach, describe, expect, it, vi } from 'vitest';

import { saveComment } from './sprintsApiComments';
import { SprintCommentVersionConflictError } from './sprintsApiCommentsHelpers';

const putMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());

vi.mock('../plannerBeerTrackerApiOverride', () => ({
  getPlannerBeerTrackerApi: () => ({ post: postMock, put: putMock }),
}));

const NOTE_ID = '11111111-1111-4111-8111-111111111111';
const note = { assigneeId: 'dev-1', height: 2, id: NOTE_ID, ifVersion: 5, text: 'Hi', width: 3 };

function serverRow(version: number) {
  return { assignee_id: 'dev-1', day: 0, height: 2, id: NOTE_ID, part: 0, text: 'Hi', version, width: 3, x: 0, y: 0 };
}

describe('saveComment optimistic lock', () => {
  beforeEach(() => {
    putMock.mockReset();
    postMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('sends ifVersion and returns the saved note with its new version', async () => {
    putMock.mockResolvedValue({ data: { comment: serverRow(6) } });
    const saved = await saveComment(12, note, true);
    expect(putMock.mock.calls[0]?.[1]).toMatchObject({ ifVersion: 5 });
    expect(saved).toMatchObject({ id: NOTE_ID, version: 6 });
  });

  it('turns 409 into a version conflict instead of re-creating the note', async () => {
    putMock.mockRejectedValue({ response: { status: 409 } });
    await expect(saveComment(12, note, true)).rejects.toBeInstanceOf(SprintCommentVersionConflictError);
    expect(postMock).not.toHaveBeenCalled();
  });
});
