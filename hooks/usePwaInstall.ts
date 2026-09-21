'use client';

import { useSyncExternalStore } from 'react';

import {
  type PwaInstallMode,
  isAppleMobileDevice,
  isStandaloneDisplay,
  resolvePwaInstallMode,
} from '@/lib/pwa/pwaInstallMode';
import {
  getPwaInstallPromptServerSnapshot,
  getPwaInstallPromptSnapshot,
  promptPwaInstall,
  subscribePwaInstallPrompt,
} from '@/lib/pwa/pwaInstallPromptStore';

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface UsePwaInstallResult {
  mode: PwaInstallMode;
  promptInstall: () => Promise<boolean>;
}

function readStandaloneDisplay(): boolean {
  const nav = window.navigator as NavigatorWithStandalone;
  return isStandaloneDisplay({
    matchesStandalone: window.matchMedia('(display-mode: standalone)').matches,
    matchesWindowControlsOverlay: window.matchMedia('(display-mode: window-controls-overlay)')
      .matches,
    navigatorStandalone: nav.standalone === true,
  });
}

function subscribeStandaloneDisplay(onStoreChange: () => void): () => void {
  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  const overlayQuery = window.matchMedia('(display-mode: window-controls-overlay)');
  standaloneQuery.addEventListener('change', onStoreChange);
  overlayQuery.addEventListener('change', onStoreChange);
  return () => {
    standaloneQuery.removeEventListener('change', onStoreChange);
    overlayQuery.removeEventListener('change', onStoreChange);
  };
}

function subscribeNoop(): () => void {
  return () => {};
}

function getAppleMobileSnapshot(): boolean {
  return isAppleMobileDevice(window.navigator.userAgent, window.navigator.maxTouchPoints);
}

export function usePwaInstall(): UsePwaInstallResult {
  const standalone = useSyncExternalStore(
    subscribeStandaloneDisplay,
    readStandaloneDisplay,
    () => false
  );
  const appleMobile = useSyncExternalStore(subscribeNoop, getAppleMobileSnapshot, () => false);
  const promptState = useSyncExternalStore(
    subscribePwaInstallPrompt,
    getPwaInstallPromptSnapshot,
    getPwaInstallPromptServerSnapshot
  );

  return {
    mode: resolvePwaInstallMode({
      appleMobile,
      canPrompt: promptState === 'prompt',
      standalone: standalone || promptState === 'installed',
    }),
    promptInstall: promptPwaInstall,
  };
}
