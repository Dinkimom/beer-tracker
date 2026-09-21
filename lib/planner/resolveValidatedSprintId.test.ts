import { describe, expect, it } from 'vitest';

import { resolveValidatedSprintId } from './resolveValidatedSprintId';

describe('resolveValidatedSprintId', () => {
  const sprints = [
    { id: 1, status: 'closed', archived: false },
    { id: 2, status: 'in_progress', archived: false },
    { id: 3, status: 'planned', archived: false },
  ];

  it('returns current id when it exists in the list', () => {
    expect(resolveValidatedSprintId(3, sprints)).toBe(3);
  });

  it('picks active sprint when current id is missing from the list', () => {
    expect(resolveValidatedSprintId(999, sprints)).toBe(2);
  });

  it('prefers a valid URL sprint over the in-progress fallback', () => {
    expect(resolveValidatedSprintId(999, sprints, 3)).toBe(3);
  });

  it('picks first sprint when there is no active sprint', () => {
    const noActive = [
      { id: 10, status: 'planned', archived: false },
      { id: 11, status: 'planned', archived: false },
    ];
    expect(resolveValidatedSprintId(999, noActive)).toBe(10);
  });

  it('picks active when current is null', () => {
    expect(resolveValidatedSprintId(null, sprints)).toBe(2);
  });

  it('returns current when list is empty', () => {
    expect(resolveValidatedSprintId(5, [])).toBe(5);
    expect(resolveValidatedSprintId(null, [])).toBeNull();
  });
});
