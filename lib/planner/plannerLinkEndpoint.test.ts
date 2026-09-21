import { describe, expect, it } from 'vitest';

import {
  commentIdSetFromRecords,
  parsePlannerCommentTaskId,
  plannerLinkEndpointAliases,
  resolvePlannerLinkEndpointId,
  resolvePlannerLinkEndpoints,
  rewritePlannerLinkEndpoint,
  toPlannerCommentTaskId,
} from './plannerLinkEndpoint';

describe('plannerLinkEndpoint', () => {
  it('prefixes a raw comment uuid and keeps an already-prefixed id', () => {
    expect(toPlannerCommentTaskId('abc')).toBe('comment:abc');
    expect(toPlannerCommentTaskId('comment:abc')).toBe('comment:abc');
    expect(parsePlannerCommentTaskId('comment:abc')).toBe('abc');
    expect(parsePlannerCommentTaskId('RND-1')).toBeNull();
  });

  it('rewrites note uuids so arrows attach to comment:* cards', () => {
    const commentIds = commentIdSetFromRecords([{ id: 'n1' }, { id: 'n2' }]);
    expect(resolvePlannerLinkEndpointId('n1', commentIds)).toBe('comment:n1');
    expect(resolvePlannerLinkEndpointId('comment:n2', commentIds)).toBe('comment:n2');
    expect(resolvePlannerLinkEndpointId('RND-24', commentIds)).toBe('RND-24');
  });

  it('aliases raw comment uuids with comment:* without touching issue keys', () => {
    expect(plannerLinkEndpointAliases('RND-24')).toEqual(['RND-24']);
    expect(plannerLinkEndpointAliases('n1')).toEqual(['n1']);
    expect(plannerLinkEndpointAliases('11111111-1111-4111-8111-111111111111')).toEqual([
      '11111111-1111-4111-8111-111111111111',
      'comment:11111111-1111-4111-8111-111111111111',
    ]);
  });

  it('rewrites both ends of a stored link', () => {
    const commentIds = new Set(['n1']);
    expect(
      resolvePlannerLinkEndpoints(
        { fromTaskId: 'RND-24', id: 'l1', toTaskId: 'n1' },
        commentIds
      )
    ).toEqual({ fromTaskId: 'RND-24', id: 'l1', toTaskId: 'comment:n1' });
  });

  it('retargets a comment endpoint including a raw uuid alias', () => {
    const noteId = '11111111-1111-4111-8111-111111111111';
    expect(rewritePlannerLinkEndpoint(`comment:${noteId}`, `comment:${noteId}`, 'TASK-9')).toBe(
      'TASK-9'
    );
    expect(rewritePlannerLinkEndpoint(noteId, `comment:${noteId}`, 'TASK-9')).toBe('TASK-9');
    expect(rewritePlannerLinkEndpoint('RND-1', `comment:${noteId}`, 'TASK-9')).toBe('RND-1');
  });
});
