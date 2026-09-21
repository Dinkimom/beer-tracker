/**
 * Epic count label with Slavic plural rules (RU); English uses one vs few/many the same.
 */
function resolveEpicCountPluralForm(abs: number): 'few' | 'many' | 'one' {
  const n = abs % 100;
  const n1 = abs % 10;
  if (n > 10 && n < 20) return 'many';
  if (n1 === 1) return 'one';
  if (n1 >= 2 && n1 <= 4) return 'few';
  return 'many';
}

export function formatEpicCountLabel(
  count: number,
  t: (key: string, params?: Record<string, number | string>) => string
): string {
  const form = resolveEpicCountPluralForm(Math.abs(count));
  return t(`planning.shared.epicCount.${form}`, { count });
}
