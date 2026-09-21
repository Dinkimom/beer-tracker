import { describe, expect, it } from 'vitest';

import { pageHeaderMainPageButtonClass } from './pageHeaderMainPageButtonClass';

describe('pageHeaderMainPageButtonClass', () => {
  it('uses a white chip and blue text when active', () => {
    const className = pageHeaderMainPageButtonClass(true);
    expect(className).toContain('bg-white');
    expect(className).toContain('!text-blue-600');
  });

  it('keeps the inactive tab transparent', () => {
    const className = pageHeaderMainPageButtonClass(false);
    expect(className).toContain('border-transparent');
    expect(className).toContain('!text-gray-600');
  });
});
