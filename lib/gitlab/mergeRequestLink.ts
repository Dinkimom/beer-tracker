function findMergeRequestMarkerIndex(parts: string[]): number {
  return parts.findIndex((part, idx) => {
    if (part !== 'merge_requests') {
      return false;
    }
    if (idx === 0) {
      return false;
    }
    return parts[idx - 1] === '-' || idx >= 1;
  });
}

function resolveGitLabProjectParts(before: string[]): string[] {
  return before[before.length - 1] === '-' ? before.slice(0, -1) : before;
}

interface ParsedGitLabMergeRequestLink {
  baseUrl: string;
  iid: string;
  projectPath: string;
}

/**
 * Поддерживает ссылки вида:
 * - https://gitlab.example/group/project/-/merge_requests/123
 * - https://gitlab.example/group/project/merge_requests/123
 */
export function parseGitLabMergeRequestLink(
  rawLink: string | null | undefined
): ParsedGitLabMergeRequestLink | null {
  if (!rawLink?.trim()) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(rawLink.trim());
  } catch {
    return null;
  }

  const parts = url.pathname.split('/').filter(Boolean);
  const markerIdx = findMergeRequestMarkerIndex(parts);
  if (markerIdx < 0 || markerIdx + 1 >= parts.length) {
    return null;
  }
  const iid = parts[markerIdx + 1]?.trim();
  if (!iid) {
    return null;
  }

  const projectParts = resolveGitLabProjectParts(parts.slice(0, markerIdx));
  if (projectParts.length < 2) {
    return null;
  }

  return {
    baseUrl: `${url.protocol}//${url.host}`,
    projectPath: projectParts.join('/'),
    iid,
  };
}
