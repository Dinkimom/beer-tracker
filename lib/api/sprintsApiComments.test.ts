import { beforeEach, describe, expect, it, vi } from 'vitest';

import { moveSprintComments } from './sprintsApiComments';

const postMock = vi.hoisted(() => vi.fn());

vi.mock('../plannerBeerTrackerApiOverride', () => ({
  getPlannerBeerTrackerApi: () => ({ post: postMock }),
}));

describe('moveSprintComments', () => {
  beforeEach(() => {
    postMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('succeeds only when the server moved every note', async () => {
    postMock.mockResolvedValue({ data: { moved: 2, success: true } });
    await expect(moveSprintComments(12, 44, ['a', 'b'])).resolves.toBe(true);
    expect(postMock).toHaveBeenCalledWith('/sprints/12/comments/move', {
      commentIds: ['a', 'b'],
      targetSprintId: 44,
    });
  });

  it('reports a partial move as failure', async () => {
    postMock.mockResolvedValue({ data: { moved: 1, success: true } });
    await expect(moveSprintComments(12, 44, ['a', 'b'])).resolves.toBe(false);
  });

  it('reports "nothing moved" (404) as failure', async () => {
    postMock.mockRejectedValue(new Error('404'));
    await expect(moveSprintComments(12, 44, ['a'])).resolves.toBe(false);
  });

  it('does not call the server for an empty list', async () => {
    await expect(moveSprintComments(12, 44, [])).resolves.toBe(true);
    expect(postMock).not.toHaveBeenCalled();
  });
});
