import { describe, expect, it } from 'vitest';

import { resolveFeatureColumnWidthDefault } from './featureColumnWidthDefault';

describe('resolveFeatureColumnWidthDefault', () => {
  it('берёт сохранённую ширину колонки фич', () => {
    expect(resolveFeatureColumnWidthDefault(360, 240)).toBe(360);
  });

  it('копирует ширину колонки исполнителей, пока у фич нет своего значения', () => {
    expect(resolveFeatureColumnWidthDefault(null, 240)).toBe(240);
  });

  it('игнорирует нечисловое сохранённое значение фич', () => {
    expect(resolveFeatureColumnWidthDefault(Number.NaN, 240)).toBe(240);
  });
});
