/**
 * Транспортный слой — сырой HTTP/WebSocket; клиенты приложения — `lib/axios`.
 */

interface TransportOk<T> {
  data: T;
  ok: true;
}

interface TransportErr {
  error: unknown;
  ok: false;
}

export type TransportResult<T> = TransportErr | TransportOk<T>;
