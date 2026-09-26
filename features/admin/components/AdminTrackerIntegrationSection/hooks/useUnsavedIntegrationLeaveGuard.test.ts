import { describe, expect, it } from 'vitest';

import { linkLeavesCurrentPath } from './useUnsavedIntegrationLeaveGuard';

const current = 'http://localhost:3000/admin/tracker?tab=integration';

describe('linkLeavesCurrentPath', () => {
  it('treats another admin page as leaving', () => {
    expect(
      linkLeavesCurrentPath(
        { download: false, href: 'http://localhost:3000/admin/teams', rawHref: '/admin/teams', target: '' },
        current,
      ),
    ).toBe(true);
  });

  it('ignores the same page, a new tab, and in-page anchors', () => {
    expect(
      linkLeavesCurrentPath(
        {
          download: false,
          href: 'http://localhost:3000/admin/tracker',
          rawHref: '/admin/tracker',
          target: '',
        },
        current,
      ),
    ).toBe(false);
    expect(
      linkLeavesCurrentPath(
        {
          download: false,
          href: 'http://localhost:3000/admin/teams',
          rawHref: '/admin/teams',
          target: '_blank',
        },
        current,
      ),
    ).toBe(false);
    expect(
      linkLeavesCurrentPath(
        { download: false, href: `${current}#save`, rawHref: '#save', target: '' },
        current,
      ),
    ).toBe(false);
  });
});
