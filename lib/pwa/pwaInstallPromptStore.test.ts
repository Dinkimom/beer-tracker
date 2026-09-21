import { describe, expect, it } from 'vitest';

import { resolvePwaPromptStoreSnapshot } from './pwaInstallPromptStore';

describe('resolvePwaPromptStoreSnapshot', () => {
  it('prefers an install completed in this session', () => {
    expect(resolvePwaPromptStoreSnapshot(true, true)).toBe('installed');
    expect(resolvePwaPromptStoreSnapshot(false, true)).toBe('installed');
  });

  it('exposes a deferred Chromium prompt', () => {
    expect(resolvePwaPromptStoreSnapshot(true, false)).toBe('prompt');
  });

  it('is none when nothing happened', () => {
    expect(resolvePwaPromptStoreSnapshot(false, false)).toBe('none');
  });
});
