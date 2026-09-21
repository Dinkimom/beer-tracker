import { describe, expect, it } from 'vitest';

import {
  buildTransitionSubmitBody,
  isMultiUserTransitionField,
  isSingleUserTransitionField,
} from './transitionFieldsModalHelpers';

describe('transition multi-user fields', () => {
  it('detects array+user and known cache fallbacks', () => {
    expect(
      isMultiUserTransitionField({
        id: 'reviewers',
        display: 'Ревьюеры',
        required: false,
        schemaType: 'array',
        schemaItems: 'user',
      })
    ).toBe(true);
    expect(
      isMultiUserTransitionField({
        id: 'reviewers',
        display: 'Ревьюеры',
        required: false,
      })
    ).toBe(true);
    expect(
      isMultiUserTransitionField({
        id: 'followers',
        display: 'Наблюдатели',
        required: false,
        schemaType: 'array',
      })
    ).toBe(true);
    expect(
      isSingleUserTransitionField({
        id: 'assignee',
        display: 'Исполнитель',
        required: false,
        schemaType: 'user',
      })
    ).toBe(true);
    expect(
      isMultiUserTransitionField({
        id: 'sprint',
        display: 'Спринт',
        required: false,
        schemaType: 'array',
      })
    ).toBe(false);
  });

  it('serializes multi-user values as Tracker user refs', () => {
    expect(
      buildTransitionSubmitBody(
        [
          {
            id: 'reviewers',
            display: 'Ревьюеры',
            required: false,
            schemaType: 'array',
            schemaItems: 'user',
          },
        ],
        { reviewers: 'u1,u2' }
      )
    ).toEqual({
      reviewers: [{ id: 'u1' }, { id: 'u2' }],
    });
  });

  it('serializes single user as Tracker user ref', () => {
    expect(
      buildTransitionSubmitBody(
        [
          {
            id: 'assignee',
            display: 'Исполнитель',
            required: false,
            schemaType: 'user',
          },
        ],
        { assignee: 'u1' }
      )
    ).toEqual({
      assignee: { id: 'u1' },
    });
  });
});
