/**
 * Утилиты для отображения (инициалы, форматирование имён и т.д.)
 */

/**
 * Возвращает инициалы для отображения в аватаре (до 2 символов).
 * Для "Иван Петров" → "ИП", для одного слова берутся первые 2 буквы.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.trim().substring(0, 2).toUpperCase() || '??';
}

/** Короткое имя для плотных карточек: «Иван Петров» → «Иван П.». */
export function getDisplayShortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '';
  }
  if (parts.length === 1) {
    return parts[0];
  }
  const givenName = parts[0];
  const surnameInitial = parts[parts.length - 1][0]?.toUpperCase();
  if (!surnameInitial) {
    return givenName;
  }
  return `${givenName} ${surnameInitial}.`;
}

