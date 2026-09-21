import { describe, expect, it } from 'vitest';

import { filterFeatureLaneMoveSprints } from './FeatureLaneRowSprintPicker';

describe('filterFeatureLaneMoveSprints', () => {
  it('убирает текущий и архивные спринты', () => {
    const sprints = [
      { archived: false, id: 1, name: 'A' },
      { archived: true, id: 2, name: 'B' },
      { archived: false, id: 3, name: 'C' },
    ];
    expect(filterFeatureLaneMoveSprints(sprints, 1).map((sprint) => sprint.id)).toEqual([3]);
  });
});
