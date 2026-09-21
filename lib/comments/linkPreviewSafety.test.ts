import { describe, expect, it } from 'vitest';

import {
  hasBlockedResolvedAddress,
  inspectLinkPreviewTarget,
  isBlockedIpAddress,
} from './linkPreviewSafety';

function dotted(...octets: number[]): string {
  return octets.join('.');
}

describe('inspectLinkPreviewTarget', () => {
  it('accepts a public https url', () => {
    const inspected = inspectLinkPreviewTarget('https://example.com/docs');
    expect(inspected.ok).toBe(true);
    if (inspected.ok) {
      expect(inspected.url.hostname).toBe('example.com');
    }
  });

  it('rejects missing, non-http, credentialed and loopback targets', () => {
    expect(inspectLinkPreviewTarget(null).ok).toBe(false);
    expect(inspectLinkPreviewTarget('javascript:alert(1)').ok).toBe(false);
    expect(inspectLinkPreviewTarget('https://user:pass@example.com').ok).toBe(false);
    expect(inspectLinkPreviewTarget('https://localhost/admin').ok).toBe(false);
    expect(inspectLinkPreviewTarget(`https://${dotted(127, 0, 0, 1)}/`).ok).toBe(false);
    expect(inspectLinkPreviewTarget(`https://${dotted(192, 168, 0, 10)}/`).ok).toBe(false);
  });
});

describe('isBlockedIpAddress', () => {
  it('blocks private, link-local and loopback addresses', () => {
    expect(isBlockedIpAddress(dotted(10, 0, 0, 5))).toBe(true);
    expect(isBlockedIpAddress(dotted(172, 16, 4, 1))).toBe(true);
    expect(isBlockedIpAddress(dotted(169, 254, 169, 254))).toBe(true);
    expect(isBlockedIpAddress('::1')).toBe(true);
    expect(isBlockedIpAddress(`::ffff:${dotted(127, 0, 0, 1)}`)).toBe(true);
    expect(isBlockedIpAddress(dotted(8, 8, 8, 8))).toBe(false);
  });
});

describe('hasBlockedResolvedAddress', () => {
  it('is true when any resolved address is private', () => {
    expect(hasBlockedResolvedAddress([dotted(8, 8, 8, 8), dotted(10, 1, 1, 1)])).toBe(true);
    expect(hasBlockedResolvedAddress([dotted(1, 1, 1, 1)])).toBe(false);
  });
});
