import toast from 'react-hot-toast';

/**
 * Копирует текст в буфер. Success-toast только если передан `successMessage`
 * (для кнопок с галкой на иконке тост не нужен).
 */
export async function copyTextToClipboard(
  text: string,
  successMessage?: string
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    if (successMessage) {
      toast.success(successMessage);
    }
    return true;
  } catch {
    toast.error('Не удалось скопировать');
    return false;
  }
}
