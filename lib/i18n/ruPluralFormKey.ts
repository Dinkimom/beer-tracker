/** Выбор ключа i18n для русской формы числительного (1 / 2–4 / 5+). */
export function ruPluralFormKey(
  count: number,
  keys: { few: string; many: string; one: string }
): string {
  const n = count;
  const isOne = n % 10 === 1 && n % 100 !== 11;
  if (isOne) {
    return keys.one;
  }
  const isFew = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20);
  if (isFew) {
    return keys.few;
  }
  return keys.many;
}
