/**
 * Получает значение из localStorage с обработкой ошибок
 */
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      return JSON.parse(saved) as T;
    }
  } catch (error) {
    console.error(`Ошибка при загрузке из localStorage (${key}):`, error);
  }

  return defaultValue;
}

/**
 * Сохраняет значение в localStorage с обработкой ошибок
 */
export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Ошибка при сохранении в localStorage (${key}):`, error);
  }
}
