import { describe, expect, it } from 'vitest';

import { parseMoveSprintCommentsBody } from './sprintCommentsMoveRouteHelpers';

describe('parseMoveSprintCommentsBody', () => {
  it('принимает список uuid и другой спринт', () => {
    expect(
      parseMoveSprintCommentsBody(
        {
          commentIds: ['11111111-1111-4111-8111-111111111111'],
          targetSprintId: 44,
        },
        12
      )
    ).toEqual({
      ok: true,
      value: {
        commentIds: ['11111111-1111-4111-8111-111111111111'],
        targetSprintId: 44,
      },
    });
  });

  it('отклоняет перенос в тот же спринт', () => {
    expect(
      parseMoveSprintCommentsBody(
        {
          commentIds: ['11111111-1111-4111-8111-111111111111'],
          targetSprintId: 12,
        },
        12
      )
    ).toEqual({ error: 'Target sprint must differ', ok: false, status: 400 });
  });
});
