type PwaPromptStoreSnapshot = 'installed' | 'none' | 'prompt';

interface BeforeInstallPromptEvent extends Event {
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt: () => Promise<void>;
}

const listeners = new Set<() => void>();

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedThisSession = false;
let windowListenersBound = false;

export function resolvePwaPromptStoreSnapshot(
  hasDeferredPrompt: boolean,
  wasInstalledThisSession: boolean
): PwaPromptStoreSnapshot {
  if (wasInstalledThisSession) {
    return 'installed';
  }
  if (hasDeferredPrompt) {
    return 'prompt';
  }
  return 'none';
}

function emitPwaPromptStore(): void {
  for (const listener of listeners) {
    listener();
  }
}

function onBeforeInstallPrompt(event: Event): void {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  emitPwaPromptStore();
}

function onAppInstalled(): void {
  deferredPrompt = null;
  installedThisSession = true;
  emitPwaPromptStore();
}

function bindWindowListeners(): void {
  if (windowListenersBound || typeof window === 'undefined') {
    return;
  }
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);
  windowListenersBound = true;
}

function unbindWindowListeners(): void {
  if (!windowListenersBound || typeof window === 'undefined') {
    return;
  }
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.removeEventListener('appinstalled', onAppInstalled);
  windowListenersBound = false;
}

export function subscribePwaInstallPrompt(onStoreChange: () => void): () => void {
  bindWindowListeners();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) {
      unbindWindowListeners();
    }
  };
}

export function getPwaInstallPromptSnapshot(): PwaPromptStoreSnapshot {
  return resolvePwaPromptStoreSnapshot(deferredPrompt !== null, installedThisSession);
}

export function getPwaInstallPromptServerSnapshot(): PwaPromptStoreSnapshot {
  return 'none';
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  if (outcome === 'accepted') {
    installedThisSession = true;
  }
  emitPwaPromptStore();
  return outcome === 'accepted';
}
