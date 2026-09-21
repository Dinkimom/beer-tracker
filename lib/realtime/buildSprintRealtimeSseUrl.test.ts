import { describe, expect, it } from 'vitest';

import { buildSprintRealtimeSseUrl } from './buildSprintRealtimeSseUrl';
import { SPRINT_REALTIME_PATH } from './sprintRealtimeConstants';

describe('buildSprintRealtimeSseUrl', () => {
  it('uses a same-origin relative SSE path', () => {
    const url = buildSprintRealtimeSseUrl({
      organizationId: 'org-1',
      sprintId: 12,
    });
    expect(url.startsWith(`${SPRINT_REALTIME_PATH}?`)).toBe(true);
    const parsed = new URL(url, 'http://localhost');
    expect(parsed.searchParams.get('sprintId')).toBe('12');
    expect(parsed.searchParams.get('organizationId')).toBe('org-1');
    expect(parsed.searchParams.get('clientId')).toBeNull();
  });

  it('includes a tab client id when provided', () => {
    const url = buildSprintRealtimeSseUrl({
      clientId: 'tab-1',
      organizationId: 'org-1',
      sprintId: 12,
    });
    const parsed = new URL(url, 'http://localhost');
    expect(parsed.searchParams.get('clientId')).toBe('tab-1');
  });
});
