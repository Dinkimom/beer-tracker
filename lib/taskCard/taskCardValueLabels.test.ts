import { describe, expect, it } from 'vitest';

import { applyTaskCardValueLabels, mergeTaskCardValueLabel, readTaskCardValueLabels } from './taskCardValueLabels';

describe('taskCardValueLabels', () => {
  it('keeps a short name and drops an empty one', () => {
    const named = mergeTaskCardValueLabel(undefined, 'Needs clarification from the product owner', 'Уточнить');
    expect(named).toEqual({ 'Needs clarification from the product owner': 'Уточнить' });
    expect(mergeTaskCardValueLabel(named, 'Needs clarification from the product owner', '   ')).toBeUndefined();
    expect(readTaskCardValueLabels({ Yes: '  ', No: 'Нет' })).toEqual({ No: 'Нет' });
  });

  it('replaces one value and each part of a joined list', () => {
    const labels = { No: 'Нет', 'Needs clarification from the product owner': 'Уточнить' };
    expect(applyTaskCardValueLabels('Needs clarification from the product owner', labels)).toBe('Уточнить');
    expect(applyTaskCardValueLabels('Yes', labels)).toBe('Yes');
    expect(applyTaskCardValueLabels('Needs clarification from the product owner, No', labels)).toBe('Уточнить, Нет');
  });
});