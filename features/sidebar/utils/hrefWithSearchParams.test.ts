import { describe, expect, it } from 'vitest';

import { hrefWithSearchParams } from '@/features/sidebar/utils/hrefWithSearchParams';

describe('hrefWithSearchParams', () => {
  it('appends query to pathname', () => {
    const params = new URLSearchParams({ sidebarTab: 'goals', x: '1' });
    expect(hrefWithSearchParams('/demo/planner', params)).toBe('/demo/planner?sidebarTab=goals&x=1');
  });

  it('returns pathname when query is empty', () => {
    expect(hrefWithSearchParams('/demo/planner', new URLSearchParams())).toBe('/demo/planner');
  });
});
