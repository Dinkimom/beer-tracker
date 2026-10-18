import { describe, expect, it } from 'vitest';

import { pageHeaderMainPageButtonClass } from './pageHeaderMainPageButtonClass';

describe('pageHeaderMainPageButtonClass', () => {
  it('marks the active tab with primary text and no resting fill', () => {
    const className = pageHeaderMainPageButtonClass(true);
    expect(className).toContain('!bg-transparent');
    expect(className).toContain('!border-transparent');
    expect(className).toContain('!text-blue-600');
    expect(className).toContain('dark:!text-blue-300');
  });

  it('keeps the inactive tab transparent', () => {
    const className = pageHeaderMainPageButtonClass(false);
    expect(className).toContain('!bg-transparent');
    expect(className).toContain('!text-ds-text-muted');
  });
});
