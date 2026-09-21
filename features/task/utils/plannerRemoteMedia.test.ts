import { describe, expect, it } from 'vitest';

import { isLocalPlannerMediaUrl, resolveDeferredPlannerMediaUrl } from './plannerRemoteMedia';

describe('isLocalPlannerMediaUrl', () => {
  it('treats blob and data URLs as local', () => {
    expect(isLocalPlannerMediaUrl('blob:http://localhost/1')).toBe(true);
    expect(isLocalPlannerMediaUrl('data:image/png;base64,abc')).toBe(true);
  });

  it('treats API and http URLs as remote', () => {
    expect(isLocalPlannerMediaUrl('/api/sprints/1/comments/c1/image')).toBe(false);
    expect(isLocalPlannerMediaUrl('https://cdn.example/photo.jpg')).toBe(false);
  });
});

describe('resolveDeferredPlannerMediaUrl', () => {
  it('keeps local previews even while remote media is paused', () => {
    expect(resolveDeferredPlannerMediaUrl('blob:photo', false)).toBe('blob:photo');
  });

  it('hides remote URLs until the overlay allows them', () => {
    expect(resolveDeferredPlannerMediaUrl('/api/sprints/1/comments/c1/image', false)).toBeUndefined();
  });

  it('returns remote URLs after the overlay is gone', () => {
    expect(resolveDeferredPlannerMediaUrl('/api/sprints/1/comments/c1/image', true)).toBe(
      '/api/sprints/1/comments/c1/image'
    );
  });

  it('returns undefined when there is no URL', () => {
    expect(resolveDeferredPlannerMediaUrl(undefined, true)).toBeUndefined();
  });
});
