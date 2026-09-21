import { isIP } from 'node:net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.internal',
]);

type InspectedLinkPreviewUrl =
  | { error: string; ok: false }
  | { ok: true; url: URL };

export function inspectLinkPreviewTarget(raw: string | null): InspectedLinkPreviewUrl {
  if (!raw?.trim()) {
    return { error: 'url is required', ok: false };
  }
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { error: 'Invalid url', ok: false };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: 'Only http and https urls are allowed', ok: false };
  }
  if (url.username || url.password) {
    return { error: 'Urls with credentials are not allowed', ok: false };
  }
  if (isBlockedHostname(url.hostname) || isBlockedIpAddress(url.hostname)) {
    return { error: 'Url host is not allowed', ok: false };
  }
  return { ok: true, url };
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTNAMES.has(host)) {
    return true;
  }
  return host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal');
}

const BLOCKED_IPV4_A_OCTETS = new Set([0, 10, 127]);

export function isBlockedIpAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    return isBlockedIpv4(ip);
  }
  if (version === 6) {
    return isBlockedIpv6(ip);
  }
  return false;
}

export function hasBlockedResolvedAddress(addresses: readonly string[]): boolean {
  return addresses.some((address) => isBlockedIpAddress(address));
}

function parseIpv4Octets(ip: string): [number, number] | null {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return null;
  }
  return [parts[0], parts[1]];
}

function isBlockedIpv4(ip: string): boolean {
  const octets = parseIpv4Octets(ip);
  if (!octets) {
    return true;
  }
  const [a, b] = octets;
  if (BLOCKED_IPV4_A_OCTETS.has(a) || a >= 224) {
    return true;
  }
  return isBlockedIpv4SecondOctet(a, b);
}

function isBlockedIpv4SecondOctet(a: number, b: number): boolean {
  if (a === 169) {
    return b === 254;
  }
  if (a === 172) {
    return b >= 16 && b <= 31;
  }
  if (a === 192) {
    return b === 168;
  }
  if (a === 100) {
    return b >= 64 && b <= 127;
  }
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::' || normalized === '::1') {
    return true;
  }
  if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) {
    return isBlockedIpv4(mapped[1]);
  }
  return false;
}
