/** Strict decimal id: no leading zeros, 1…10 digits. */
export function parsePositiveDecimalId(raw: string | null | undefined): number | null {
  const q = (raw ?? '').trim();
  if (!/^[1-9]\d{0,9}$/.test(q)) {
    return null;
  }
  return Number.parseInt(q, 10);
}
