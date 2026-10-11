const FALLBACK_VERSION = 'dev';

export function formatAppVersionLabel(packageVersion: string): string {
  return packageVersion.trim() || FALLBACK_VERSION;
}

export function getAppVersionLabel(): string {
  return formatAppVersionLabel(process.env.NEXT_PUBLIC_APP_VERSION ?? '');
}
