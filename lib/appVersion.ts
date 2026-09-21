const FALLBACK_VERSION = 'dev';

export function formatAppVersionLabel(packageVersion: string, gitSha: string): string {
  const pkg = packageVersion.trim();
  const sha = gitSha.trim();
  if (pkg && sha) {
    return `${pkg} (${sha})`;
  }
  return pkg || sha || FALLBACK_VERSION;
}

export function getAppVersionLabel(): string {
  return formatAppVersionLabel(
    process.env.NEXT_PUBLIC_APP_VERSION ?? '',
    process.env.NEXT_PUBLIC_GIT_SHA ?? ''
  );
}
