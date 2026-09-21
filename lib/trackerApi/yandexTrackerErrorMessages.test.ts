import { describe, expect, it } from 'vitest';

import { userMessageFromYandexTrackerErrorBody } from './yandexTrackerErrorMessages';

describe('userMessageFromYandexTrackerErrorBody', () => {
  it('returns undefined for nullish', () => {
    expect(userMessageFromYandexTrackerErrorBody(undefined)).toBeUndefined();
    expect(userMessageFromYandexTrackerErrorBody(null)).toBeUndefined();
  });

  it('trims plain string body', () => {
    expect(userMessageFromYandexTrackerErrorBody('  x  ')).toBe('x');
    expect(userMessageFromYandexTrackerErrorBody('   ')).toBeUndefined();
  });

  it('prefers errorMessage then message then error', () => {
    expect(
      userMessageFromYandexTrackerErrorBody({ errorMessage: 'a', message: 'b', error: 'c' })
    ).toBe('a');
    expect(userMessageFromYandexTrackerErrorBody({ message: 'b', error: 'c' })).toBe('b');
    expect(userMessageFromYandexTrackerErrorBody({ error: 'c' })).toBe('c');
  });

  it('joins errorMessages array', () => {
    expect(
      userMessageFromYandexTrackerErrorBody({ errorMessages: ['one', 'two'] })
    ).toBe('one; two');
  });

  it('ignores empty strings in errorMessages', () => {
    expect(
      userMessageFromYandexTrackerErrorBody({ errorMessages: ['', 'ok', '  '] })
    ).toBe('ok');
  });
});
