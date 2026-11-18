/**
 * UUID v4 для id на клиенте и сервере.
 *
 * `crypto.randomUUID` есть только в защищённом контексте (https или localhost):
 * на self-hosted по `http://<хост в сети>` его нет, и прямой вызов роняет планер.
 * `crypto.getRandomValues` доступен везде — на нём фолбэк.
 */
export function randomUuid(): string {
  /* eslint-disable no-restricted-properties -- единственная точка вызова, с фолбэком ниже */
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  /* eslint-enable no-restricted-properties */
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
