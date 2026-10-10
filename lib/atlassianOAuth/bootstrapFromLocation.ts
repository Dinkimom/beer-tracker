import {
  clearAtlassianOAuthErrorFromSearch,
  clearAtlassianOAuthFragmentFromLocation,
  peekAtlassianOAuthErrorFromSearch,
  peekAtlassianOAuthFragmentFromLocation,
  type AppliedAtlassianOAuthTokens,
} from './applyOAuthFragment';

interface AtlassianOAuthLocationBootstrap {
  error: string;
  tokens: AppliedAtlassianOAuthTokens | null;
}

/** Peek OAuth error query + fragment tokens without touching history (render-safe). */
export function readAtlassianOAuthLocationBootstrap(): AtlassianOAuthLocationBootstrap {
  if (typeof window === 'undefined') {
    return { error: '', tokens: null };
  }
  return {
    error: peekAtlassianOAuthErrorFromSearch(),
    tokens: peekAtlassianOAuthFragmentFromLocation(),
  };
}

/** Clear OAuth fragment / error query after bootstrap was applied (useEffect only). */
export function clearAtlassianOAuthLocationArtifacts(): void {
  clearAtlassianOAuthFragmentFromLocation();
  clearAtlassianOAuthErrorFromSearch();
}
