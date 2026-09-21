import { describe, expect, it } from 'vitest';

import { commentToSaveApiFields, mapCommentFromApi } from './sprintsApiCommentsHelpers';

describe('mapCommentFromApi', () => {
  it('maps a known note color and defaults missing color to yellow', () => {
    const base = {
      assignee_id: 'dev-1',
      day: 1,
      height: 1,
      id: 'c1',
      part: 0,
      text: 'note',
      width: 2,
      x: 0,
      y: 0,
    };

    expect(mapCommentFromApi({ ...base, color: 'pink' }).color).toBe('pink');
    expect(mapCommentFromApi(base).color).toBe('yellow');
    expect(mapCommentFromApi({ ...base, color: 'purple' }).color).toBe('yellow');
    expect(mapCommentFromApi(base).pendingApproval).toBeUndefined();
    expect(mapCommentFromApi({ ...base, pending_approval: true }).pendingApproval).toBe(true);
    expect(mapCommentFromApi(base).reactions).toBeUndefined();
    expect(mapCommentFromApi(base).authorName).toBeUndefined();
    expect(mapCommentFromApi(base).parent).toBeUndefined();
    expect(
      mapCommentFromApi({
        ...base,
        parent: { display: 'Story', id: 's1', key: 'BT-10' },
      }).parent
    ).toEqual({ display: 'Story', id: 's1', key: 'BT-10' });
    expect(
      mapCommentFromApi({
        ...base,
        author_name: '  Иван Иванов  ',
        created_by: 'user-1',
      }).authorName
    ).toBe('Иван Иванов');
    expect(
      mapCommentFromApi({
        ...base,
        reactions: [{ count: 1, emoji: '👍', mine: true }],
      }).reactions
    ).toEqual([{ count: 1, emoji: '👍', mine: true, users: [] }]);
  });

  it('maps a diagram comment to an authenticated sprint diagram url', () => {
    const base = {
      assignee_id: 'dev-1',
      day: 1,
      height: 1,
      id: 'c1',
      part: 0,
      text: 'Architecture',
      width: 2,
      x: 0,
      y: 0,
    };
    expect(
      mapCommentFromApi({
        ...base,
        image_file_id: 'file-1',
        kind: 'diagram',
      }, 9)
    ).toMatchObject({
      diagramUrl: '/api/sprints/9/comments/c1/diagram',
      imageFileId: 'file-1',
      kind: 'diagram',
      text: 'Architecture',
    });
  });

  it('maps an image comment to an authenticated sprint image url', () => {
    const base = {
      assignee_id: 'dev-1',
      day: 1,
      height: 1,
      id: 'c1',
      part: 0,
      text: 'note',
      width: 2,
      x: 0,
      y: 0,
    };
    expect(
      mapCommentFromApi({
        ...base,
        image_file_id: 'file-1',
        kind: 'image',
      }, 9)
    ).toMatchObject({
      imageFileId: 'file-1',
      imageUrl: '/api/sprints/9/comments/c1/image',
      kind: 'image',
    });
  });
});

describe('commentToSaveApiFields', () => {
  it('keeps day/part/x/y equal to 0 so left-edge resize can persist a new start', () => {
    expect(
      commentToSaveApiFields({
        assigneeId: 'dev-1',
        day: 0,
        height: 1,
        id: 'c1',
        part: 0,
        text: 'note',
        width: 4,
        x: 0,
        y: 0,
      })
    ).toMatchObject({
      day: 0,
      part: 0,
      parent: null,
      width: 4,
      x: 0,
      y: 0,
    });
    expect(
      commentToSaveApiFields({
        assigneeId: 'dev-1',
        height: 1,
        id: 'c1',
        parent: { display: 'Story', id: 's1', key: 'BT-10' },
        text: 'note',
        width: 4,
      }).parent
    ).toEqual({ display: 'Story', id: 's1', key: 'BT-10' });
  });
});
