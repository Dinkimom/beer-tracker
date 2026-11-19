import { afterEach, describe, expect, it, vi } from 'vitest';

import { publicAssetPath } from './staticDemoBuild';

describe('publicAssetPath', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps the path as is in the regular build', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '');
    expect(publicAssetPath('/assets/beer-emoji.json')).toBe('/assets/beer-emoji.json');
  });

  it('prefixes the GitHub Pages sub-path in the static demo build', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/beer-tracker');
    expect(publicAssetPath('/demo/avatars/ken.jpg')).toBe('/beer-tracker/demo/avatars/ken.jpg');
  });
});
