import { describe, expect, it } from 'vitest';

import {
  isAppleMobileDevice,
  isStandaloneDisplay,
  resolvePwaInstallMode,
} from './pwaInstallMode';

describe('isStandaloneDisplay', () => {
  it('is true for standalone, overlay, or iOS navigator.standalone', () => {
    expect(
      isStandaloneDisplay({
        matchesStandalone: true,
        matchesWindowControlsOverlay: false,
        navigatorStandalone: false,
      })
    ).toBe(true);
    expect(
      isStandaloneDisplay({
        matchesStandalone: false,
        matchesWindowControlsOverlay: true,
        navigatorStandalone: false,
      })
    ).toBe(true);
    expect(
      isStandaloneDisplay({
        matchesStandalone: false,
        matchesWindowControlsOverlay: false,
        navigatorStandalone: true,
      })
    ).toBe(true);
  });

  it('is false in a regular browser tab', () => {
    expect(
      isStandaloneDisplay({
        matchesStandalone: false,
        matchesWindowControlsOverlay: false,
        navigatorStandalone: false,
      })
    ).toBe(false);
  });
});

describe('isAppleMobileDevice', () => {
  it('detects iPhone and iPadOS-as-Mac', () => {
    expect(isAppleMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(
      true
    );
    expect(isAppleMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
  });

  it('does not treat desktop Mac as mobile', () => {
    expect(isAppleMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
  });
});

describe('resolvePwaInstallMode', () => {
  it('prefers standalone, then Chromium prompt, then iOS copy', () => {
    expect(
      resolvePwaInstallMode({ appleMobile: true, canPrompt: true, standalone: true })
    ).toBe('standalone');
    expect(
      resolvePwaInstallMode({ appleMobile: false, canPrompt: true, standalone: false })
    ).toBe('prompt');
    expect(
      resolvePwaInstallMode({ appleMobile: true, canPrompt: false, standalone: false })
    ).toBe('ios');
    expect(
      resolvePwaInstallMode({ appleMobile: false, canPrompt: false, standalone: false })
    ).toBe('manual');
  });
});
