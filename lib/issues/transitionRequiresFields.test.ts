import { describe, expect, it } from 'vitest';

import {
  parseRequiredFieldIdsFromErrorMessages,
  transitionFieldsFromErrorMessages,
} from './transitionRequiresFields';

describe('parseRequiredFieldIdsFromErrorMessages', () => {
  it('parses Russian Tracker message with a single field', () => {
    expect(
      parseRequiredFieldIdsFromErrorMessages([
        'Вы должны указать значения для полей comment.',
      ])
    ).toEqual(['comment']);
  });

  it('parses multiple comma-separated fields', () => {
    expect(
      parseRequiredFieldIdsFromErrorMessages([
        'Вы должны указать значения для полей comment, resolution.',
      ])
    ).toEqual(['comment', 'resolution']);
  });

  it('parses English-style fields message', () => {
    expect(
      parseRequiredFieldIdsFromErrorMessages([
        'You must set values for the fields comment.',
      ])
    ).toEqual(['comment']);
  });

  it('returns empty when message has no field list', () => {
    expect(parseRequiredFieldIdsFromErrorMessages(['Something else'])).toEqual([]);
  });
});

describe('transitionFieldsFromErrorMessages', () => {
  it('maps comment to a required textarea field', () => {
    expect(
      transitionFieldsFromErrorMessages(['Вы должны указать значения для полей comment.'])
    ).toEqual([
      {
        id: 'comment',
        display: 'Комментарий',
        required: true,
        schemaType: 'string',
      },
    ]);
  });
});
