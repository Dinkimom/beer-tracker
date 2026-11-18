import { describe, expect, it } from 'vitest';

import { ZIndex } from './zIndex';

const LEVELS = Object.keys(ZIndex).filter(
  (key) => typeof ZIndex[key as keyof typeof ZIndex] === 'number'
) as Array<Parameters<typeof ZIndex.class>[0]>;

describe('ZIndex.class', () => {
  it.each(LEVELS)('%s: класс совпадает с числом слоя', (level) => {
    expect(ZIndex.class(level)).toBe(`z-[${ZIndex.value(level)}]`);
  });
});
