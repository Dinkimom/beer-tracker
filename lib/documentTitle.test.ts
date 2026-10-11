import { describe, expect, it } from 'vitest';

import {
  formatPlannerDocumentTitle,
  isPlannerDocumentTitleRoute,
  resolvePlannerDocumentTitle,
} from './documentTitle';

describe('isPlannerDocumentTitleRoute', () => {
  it('covers the planner index and the canonical sprint url', () => {
    expect(isPlannerDocumentTitleRoute('/')).toBe(true);
    expect(isPlannerDocumentTitleRoute('/planner/12/sprint/34')).toBe(true);
  });

  it('does not cover other app routes', () => {
    expect(isPlannerDocumentTitleRoute('/select-board')).toBe(false);
    expect(isPlannerDocumentTitleRoute('/admin/org')).toBe(false);
  });
});

describe('formatPlannerDocumentTitle', () => {
  it('keeps a short sprint number from being the whole tab title', () => {
    expect(formatPlannerDocumentTitle({ boardLabel: 'Booking', sprintName: '32' })).toBe('32 · Booking');
  });

  it('returns the sprint name when the team label is missing', () => {
    expect(formatPlannerDocumentTitle({ boardLabel: '  ', sprintName: '32' })).toBe('32');
  });

  it('does not repeat a team label that matches the sprint name', () => {
    expect(formatPlannerDocumentTitle({ boardLabel: '32', sprintName: '32' })).toBe('32');
  });

  it('keeps a descriptive sprint name and adds the team', () => {
    expect(formatPlannerDocumentTitle({ boardLabel: 'Booking', sprintName: 'Q1 · 2601' })).toBe(
      'Q1 · 2601 · Booking'
    );
  });
});

describe('resolvePlannerDocumentTitle', () => {
  it('uses the backlog label on the backlog tab', () => {
    expect(
      resolvePlannerDocumentTitle({
        backlogTitle: 'Бэклог',
        boardLabel: 'Booking',
        sprintName: '32',
        tab: 'backlog',
      })
    ).toBe('Бэклог');
  });

  it('keeps the sprint and team on the other planner tabs', () => {
    expect(
      resolvePlannerDocumentTitle({
        backlogTitle: 'Бэклог',
        boardLabel: 'Booking',
        sprintName: '32',
        tab: 'board',
      })
    ).toBe('32 · Booking');
  });
});
