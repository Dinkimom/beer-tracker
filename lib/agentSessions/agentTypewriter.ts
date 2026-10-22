/**
 * «Печать» ответа агента в чате планера. Текст приходит целиком (аргумент `reply_agent_session`),
 * поэтому выводим его по словам за ~1–1.5 с при любой длине: короткий — не мгновенно, длинный — не долго.
 */

/** Шаг таймера печати, мс. */
export const AGENT_TYPEWRITER_TICK_MS = 33;

/** Примерно столько тиков на весь текст (~1.5 с). */
const TICKS_PER_MESSAGE = 45;

const MIN_CHARS_PER_TICK = 2;

/** Насколько дальше шага можно дотянуть до конца слова. */
const WORD_TAIL_LIMIT = 24;

/** Следующая длина видимой части: шаг по длине текста, обрезка по границе слова. */
export function nextTypewriterCut(text: string, shown: number): number {
  if (shown >= text.length) {
    return text.length;
  }
  const step = Math.max(MIN_CHARS_PER_TICK, Math.ceil(text.length / TICKS_PER_MESSAGE));
  const target = Math.min(text.length, shown + step);
  const limit = Math.min(text.length, target + WORD_TAIL_LIMIT);
  for (let index = target; index < limit; index += 1) {
    if (/\s/.test(text[index] ?? '')) {
      return index;
    }
  }
  return limit;
}
