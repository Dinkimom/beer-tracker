/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

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
});
