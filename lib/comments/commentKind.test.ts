import { describe, expect, it } from 'vitest';

import { parsePlannerCommentDiagramUrl, parsePlannerCommentKind, plannerCommentDiagramUrl, plannerCommentImageUrl } from './commentKind';

describe('commentKind', () => {
  it('parses image, diagram and defaults to text', () => {
    expect(parsePlannerCommentKind('image')).toBe('image');
    expect(parsePlannerCommentKind('diagram')).toBe('diagram');
    expect(parsePlannerCommentKind('text')).toBe('text');
    expect(parsePlannerCommentKind(undefined)).toBe('text');
  });

  it('builds authenticated urls for sprint comment files', () => {
    expect(plannerCommentImageUrl(12, 'c1')).toBe('/api/sprints/12/comments/c1/image');
    expect(plannerCommentDiagramUrl(12, 'c1')).toBe('/api/sprints/12/comments/c1/diagram');
  });

  it('parses a planner diagram url', () => {
    expect(parsePlannerCommentDiagramUrl(plannerCommentDiagramUrl(9, 'c1'))).toEqual({
      commentId: 'c1',
      sprintId: 9,
    });
    expect(parsePlannerCommentDiagramUrl(undefined)).toBeNull();
  });
});
