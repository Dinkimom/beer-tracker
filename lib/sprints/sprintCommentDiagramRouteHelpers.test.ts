import { describe, expect, it } from 'vitest';

import { MAX_PLANNER_DAY_INDEX } from '@/constants';

import { parseCreateDiagramCommentBody, parseDiagramSceneBody } from './sprintCommentDiagramRouteHelpers';

describe('parseCreateDiagramCommentBody', () => {
  it('accepts a named diagram with geometry', () => {
    expect(
      parseCreateDiagramCommentBody({
        assigneeId: 'dev-1',
        day: 1,
        name: ' Architecture ',
        part: 0,
        width: 2,
        height: 1,
      })
    ).toMatchObject({
      ok: true,
      value: {
        assigneeId: 'dev-1',
        day: 1,
        height: 1,
        name: ' Architecture ',
        part: 0,
        width: 2,
      },
    });
  });

  it('rejects invalid day', () => {
    expect(
      parseCreateDiagramCommentBody({
        assigneeId: 'dev-1',
        day: MAX_PLANNER_DAY_INDEX + 1,
        part: 0,
      })
    ).toMatchObject({ ok: false, status: 400 });
  });
});

describe('parseDiagramSceneBody', () => {
  it('accepts a v1 scene', () => {
    expect(
      parseDiagramSceneBody({
        elements: [{ id: 'a', type: 'rectangle' }],
        name: 'Flow',
        v: 1,
      })
    ).toEqual({
      ok: true,
      scene: {
        elements: [{ id: 'a', type: 'rectangle' }],
        name: 'Flow',
        v: 1,
      },
    });
  });

  it('rejects a scene without v1', () => {
    expect(parseDiagramSceneBody({ elements: [] })).toMatchObject({ ok: false, status: 400 });
  });
});
