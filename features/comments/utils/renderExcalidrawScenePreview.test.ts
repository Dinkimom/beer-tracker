import { describe, expect, it } from 'vitest';

import { renderExcalidrawScenePreview } from './renderExcalidrawScenePreview';

describe('renderExcalidrawScenePreview', () => {
  it('returns null when the scene has nothing to draw', async () => {
    await expect(
      renderExcalidrawScenePreview({ elements: [], v: 1 })
    ).resolves.toBeNull();
  });
});
