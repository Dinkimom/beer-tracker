import type { AxiosError } from 'axios';

/** Сообщение об ошибке из тела ответа Next.js API (`{ error?: string }`). */
export function readApiErrorMessage(error: unknown, fallback: string): string {
  const ax = error as AxiosError<{ error?: string }>;
  const msg = ax.response?.data?.error;
  return typeof msg === 'string' && msg.trim() ? msg : fallback;
}

export function readApiErrorStatus(error: unknown): number | undefined {
  const ax = error as AxiosError;
  return ax.response?.status;
}
