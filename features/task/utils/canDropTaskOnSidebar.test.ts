import { describe, expect, it } from 'vitest';

import { canDropTaskOnSidebar } from './canDropTaskOnSidebar';

describe('canDropTaskOnSidebar', () => {
  it('allows tracker work tasks, including the synthetic QA card', () => {
    expect(canDropTaskOnSidebar({ id: 'PROJ-1' })).toBe(true);
    expect(canDropTaskOnSidebar({ id: '6f1c6b1e-0000-5000-8000-000000000000' })).toBe(true);
  });

  it('rejects notes, photos, diagrams and widgets', () => {
    expect(canDropTaskOnSidebar({ id: 'comment:1' })).toBe(false);
    expect(canDropTaskOnSidebar({ id: 'comment:2', localDraftKind: 'diagram' })).toBe(false);
    expect(canDropTaskOnSidebar({ id: 'comment:3', localDraftKind: 'image' })).toBe(false);
    expect(canDropTaskOnSidebar({ id: 'comment:4', localDraftKind: 'widget' })).toBe(false);
    expect(canDropTaskOnSidebar({ id: 'local-image:5' })).toBe(false);
  });

  it('rejects local quick-add drafts', () => {
    expect(canDropTaskOnSidebar({ id: 'local-task-1', isLocalTask: true })).toBe(false);
    expect(
      canDropTaskOnSidebar({ id: 'local-task-2', isLocalTask: true, localDraftKind: 'existing' })
    ).toBe(false);
  });
});
