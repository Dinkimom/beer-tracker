import { describe, expect, it } from 'vitest';

import { nextTypewriterCut } from './agentTypewriter';

function ticksToFinish(text: string): number {
  let shown = 0;
  let ticks = 0;
  while (shown < text.length) {
    shown = nextTypewriterCut(text, shown);
    ticks += 1;
  }
  return ticks;
}

describe('nextTypewriterCut', () => {
  it('cuts on word boundaries', () => {
    const text = 'Поставил RND-1441 на вторник и перенёс RND-2000 на четверг';
    expect(text[nextTypewriterCut(text, 0)]).toBe(' ');
  });

  it('never goes past the end and stays there', () => {
    expect(nextTypewriterCut('ok', 0)).toBe(2);
    expect(nextTypewriterCut('ok', 2)).toBe(2);
  });

  it('finishes short and long replies in a similar number of ticks', () => {
    const short = 'Готово, задача на доске.';
    const long = 'слово '.repeat(330);
    expect(ticksToFinish(short)).toBeLessThanOrEqual(15);
    expect(ticksToFinish(long)).toBeLessThanOrEqual(50);
  });
});
