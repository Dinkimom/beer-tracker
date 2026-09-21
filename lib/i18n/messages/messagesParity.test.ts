import { describe, expect, it } from 'vitest';

import { enMessages } from './en';
import { analyzeEnglishLeafQuality } from './englishMessageQuality';
import { collectLeafKeys } from './messageTree';
import { ruMessages } from './ru';

describe('i18n message catalogs', () => {
  it('keeps identical leaf key sets between ru and en', () => {
    const ruKeys = collectLeafKeys(ruMessages).sort();
    const enKeys = collectLeafKeys(enMessages).sort();
    expect(enKeys).toEqual(ruKeys);
  });

  it('keeps English leaves free of empty strings and obvious placeholders', () => {
    expect(analyzeEnglishLeafQuality(enMessages)).toEqual([]);
  });
});
