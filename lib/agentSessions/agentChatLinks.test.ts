import { describe, expect, it } from 'vitest';

import { claudeNewChatUrl, cursorPromptUrl } from './agentChatLinks';

describe('agent chat deeplinks', () => {
  it('encodes the prompt, including &', () => {
    expect(claudeNewChatUrl('a & b')).toBe('https://claude.ai/new?q=a%20%26%20b');
    expect(cursorPromptUrl('a & b')).toBe('cursor://anysphere.cursor-deeplink/prompt?text=a%20%26%20b');
  });

  it('refuses links over the length limit', () => {
    const long = 'я'.repeat(2000);
    expect(claudeNewChatUrl(long)).toBeNull();
    expect(cursorPromptUrl(long)).toBeNull();
  });
});
