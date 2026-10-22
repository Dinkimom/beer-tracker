/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { SPRINT_PRESENCE_COLOR_CSS_VAR } from './sprintPresenceColor';
import {
  clearSprintPresenceRevealClass,
  querySprintPresenceTargetElement,
  revealSprintPresenceTargetElement,
  SPRINT_PRESENCE_REVEAL_CLASS,
} from './sprintPresenceReveal';

describe('sprintPresenceReveal', () => {
  it('finds a card by data-task-id and toggles the reveal class', () => {
    const root = document.createElement('div');
    const card = document.createElement('div');
    card.setAttribute('data-task-id', 'BT-1');
    card.scrollIntoView = () => undefined;
    root.append(card);
    expect(querySprintPresenceTargetElement(root, 'BT-1')).toBe(card);
    expect(querySprintPresenceTargetElement(root, 'BT-2')).toBeNull();
    revealSprintPresenceTargetElement(card);
    expect(card.classList.contains(SPRINT_PRESENCE_REVEAL_CLASS)).toBe(true);
    clearSprintPresenceRevealClass(card);
    expect(card.classList.contains(SPRINT_PRESENCE_REVEAL_CLASS)).toBe(false);
  });

  it('flashes in the viewer color and drops it afterwards', () => {
    const card = document.createElement('div');
    card.scrollIntoView = () => undefined;
    revealSprintPresenceTargetElement(card, 'var(--presence-color-3)');
    expect(card.style.getPropertyValue(SPRINT_PRESENCE_COLOR_CSS_VAR)).toBe('var(--presence-color-3)');
    clearSprintPresenceRevealClass(card);
    expect(card.style.getPropertyValue(SPRINT_PRESENCE_COLOR_CSS_VAR)).toBe('');
  });
});
