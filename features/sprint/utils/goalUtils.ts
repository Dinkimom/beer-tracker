
/**
 * Утилиты для работы с целями спринта
 */

/**
 * Простая проверка SMART (базовая валидация)
 * Проверяет, что цель содержит действие и/или числовой показатель
 */
export function isSmartGoal(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 10) return false; // Слишком короткая цель

  // Проверяем наличие глагола действия (базовая проверка)
  const actionWords = ['увеличить', 'снизить', 'улучшить', 'реализовать', 'завершить', 'внедрить', 'создать', 'разработать', 'оптимизировать', 'настроить'];
  const lowerText = trimmed.toLowerCase();

  // Проверяем наличие хотя бы одного глагола действия или числового показателя
  const hasActionWord = actionWords.some(word => lowerText.includes(word));
  const hasNumber = /\d+/.test(trimmed);

  return hasActionWord || hasNumber;
}
