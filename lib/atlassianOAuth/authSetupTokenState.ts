import { useEffect, useSyncExternalStore } from 'react';

import {
  clearAtlassianOAuthLocationArtifacts,
  readAtlassianOAuthLocationBootstrap,
} from './bootstrapFromLocation';

interface AtlassianOAuthClientTokenState {
  atlassianConnected: boolean;
  cloudId: string;
  error: string;
  expiresAt: number | undefined;
  oauthHydrated: boolean;
  refreshToken: string;
  siteUrl: string;
  token: string;
}

const EMPTY_STATE: AtlassianOAuthClientTokenState = {
  atlassianConnected: false,
  cloudId: '',
  error: '',
  expiresAt: undefined,
  oauthHydrated: false,
  refreshToken: '',
  siteUrl: '',
  token: '',
};

let clientSnapshot: AtlassianOAuthClientTokenState | undefined;

function stateFromLocationBootstrap(): Omit<AtlassianOAuthClientTokenState, 'oauthHydrated'> {
  const bootstrap = readAtlassianOAuthLocationBootstrap();
  const tokens = bootstrap.tokens;
  if (!tokens) {
    return {
      atlassianConnected: false,
      cloudId: '',
      error: bootstrap.error,
      expiresAt: undefined,
      refreshToken: '',
      siteUrl: '',
      token: '',
    };
  }
  return {
    atlassianConnected: true,
    cloudId: tokens.cloudId,
    error: bootstrap.error,
    expiresAt: tokens.expiresAt,
    refreshToken: tokens.refreshToken,
    siteUrl: tokens.siteUrl,
    token: tokens.accessToken,
  };
}

function getClientSnapshot(): AtlassianOAuthClientTokenState {
  if (clientSnapshot === undefined) {
    clientSnapshot = { ...stateFromLocationBootstrap(), oauthHydrated: true };
  }
  return clientSnapshot;
}

function getServerSnapshot(): AtlassianOAuthClientTokenState {
  return EMPTY_STATE;
}

function subscribe(_onStoreChange: () => void): () => void {
  return () => {};
}

/**
 * OAuth fragment / error query for auth-setup & register.
 * Snapshot is read on the client (render-safe peek); history is cleared in an effect.
 */
export function useAtlassianOAuthClientTokenState(): AtlassianOAuthClientTokenState {
  const state = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    clearAtlassianOAuthLocationArtifacts();
  }, []);

  return state;
}
