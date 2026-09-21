import type { AxiosInstance } from 'axios';

const MAX_RETRIES = 6;
const MAX_GATEWAY_RETRIES = 5;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 60_000;

const GATEWAY_RETRY_STATUSES = new Set([502, 503, 504]);

function jitteredDelay(baseMs: number, jitterRatio: number): number {
  const jitter = baseMs * jitterRatio * (2 * Math.random() - 1);
  return Math.round(baseMs + jitter);
}

function parseRetryAfterDelayMs(retryAfterHeader: unknown): number | null {
  const retryAfterSec = retryAfterHeader != null ? parseInt(String(retryAfterHeader), 10) : NaN;
  if (!Number.isNaN(retryAfterSec) && retryAfterSec > 0) {
    return Math.min(retryAfterSec * 1000, MAX_DELAY_MS);
  }
  return null;
}

async function retryTrackerRequest(
  instance: AxiosInstance,
  config: NonNullable<unknown>,
  retryCount: number,
  maxRetries: number,
  delayMs: number,
  logLabel: string
): Promise<unknown> {
  const delay = jitteredDelay(delayMs, 0.15);
  const cfg = config as { url?: string };
  console.warn(`[Tracker] ${logLabel} — retry ${retryCount}/${maxRetries} after ${delay}ms (${cfg.url})`);
  await new Promise((resolve) => setTimeout(resolve, delay));
  return instance.request(config as Parameters<AxiosInstance['request']>[0]);
}

export async function handleTracker429Retry(
  instance: AxiosInstance,
  error: { config?: unknown; response?: { headers?: Record<string, unknown> } }
): Promise<unknown | null> {
  const config = error.config;
  if (!config) {
    return null;
  }
  const cfg = config as { _retryCount?: number; url?: string };
  cfg._retryCount = (cfg._retryCount ?? 0) + 1;
  if (cfg._retryCount > MAX_RETRIES) {
    return null;
  }

  const retryAfterDelay = parseRetryAfterDelayMs(error.response?.headers?.['retry-after']);
  const delayMs =
    retryAfterDelay ??
    Math.min(BASE_DELAY_MS * 2 ** (cfg._retryCount - 1), MAX_DELAY_MS);

  return await retryTrackerRequest(instance, config, cfg._retryCount, MAX_RETRIES, delayMs, '429 Too Many Requests');
}

export async function handleTrackerGatewayRetry(
  instance: AxiosInstance,
  error: { config?: unknown; response?: { status?: number; statusText?: string } }
): Promise<unknown | null> {
  const status = error.response?.status;
  const config = error.config;
  if (status == null || !GATEWAY_RETRY_STATUSES.has(status) || !config) {
    return null;
  }

  const cfg = config as { _gatewayRetryCount?: number; url?: string };
  cfg._gatewayRetryCount = (cfg._gatewayRetryCount ?? 0) + 1;
  if (cfg._gatewayRetryCount > MAX_GATEWAY_RETRIES) {
    return null;
  }

  const delayMs = Math.min(BASE_DELAY_MS * 2 ** (cfg._gatewayRetryCount - 1), MAX_DELAY_MS);
  const label = `${String(status)} ${error.response?.statusText ?? ''}`;
  return await retryTrackerRequest(
    instance,
    config,
    cfg._gatewayRetryCount,
    MAX_GATEWAY_RETRIES,
    delayMs,
    label
  );
}
