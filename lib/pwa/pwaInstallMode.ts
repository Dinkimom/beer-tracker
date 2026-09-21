export type PwaInstallMode = 'ios' | 'manual' | 'prompt' | 'standalone';

interface StandaloneDisplayInput {
  matchesStandalone: boolean;
  matchesWindowControlsOverlay: boolean;
  navigatorStandalone: boolean;
}

interface PwaInstallModeInput {
  appleMobile: boolean;
  canPrompt: boolean;
  standalone: boolean;
}

export function isStandaloneDisplay(input: StandaloneDisplayInput): boolean {
  return (
    input.matchesStandalone || input.matchesWindowControlsOverlay || input.navigatorStandalone
  );
}

/** iPhone / iPad (включая iPadOS, который представляется как Macintosh). */
export function isAppleMobileDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return true;
  }
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

export function resolvePwaInstallMode(input: PwaInstallModeInput): PwaInstallMode {
  if (input.standalone) {
    return 'standalone';
  }
  if (input.canPrompt) {
    return 'prompt';
  }
  if (input.appleMobile) {
    return 'ios';
  }
  return 'manual';
}
