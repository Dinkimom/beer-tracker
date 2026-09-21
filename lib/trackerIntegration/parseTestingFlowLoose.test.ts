import { describe, expect, it } from 'vitest';

import { parseTestingFlowConfigLoose } from './schema';

describe('parseTestingFlowConfigLoose', () => {
  it('принимает известные поля при лишних ключах в объекте testingFlow', () => {
    const r = parseTestingFlowConfigLoose({
      devAssigneeFieldId: 'lead',
      qaEngineerFieldId: 'qaOwner',
      futureOrUnknownKey: true,
    });
    expect(r?.devAssigneeFieldId).toBe('lead');
    expect(r?.qaEngineerFieldId).toBe('qaOwner');
  });
});
