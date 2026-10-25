import { describe, expect, it } from 'vitest';

import { resolveAnnotationContextMenuActions } from './annotationContextMenuActions';

const sorted = (variant: Parameters<typeof resolveAnnotationContextMenuActions>[0]) =>
  [...resolveAnnotationContextMenuActions(variant)].sort();

describe('resolveAnnotationContextMenuActions', () => {
  it('gives notes the full menu', () => {
    expect(sorted('note')).toEqual([
      'askAgent',
      'assignee',
      'color',
      'convert',
      'copy',
      'delete',
      'edit',
      'link',
      'moveToSprint',
      'parent',
    ]);
  });

  it('lets diagrams be edited but not converted, copied, recoloured or moved', () => {
    expect(sorted('diagram')).toEqual(['assignee', 'delete', 'edit', 'link', 'parent']);
  });

  it('has no composer for photos and widgets', () => {
    expect(sorted('image')).toEqual(['assignee', 'delete', 'link', 'parent']);
    expect(sorted('widget')).toEqual(['assignee', 'delete', 'link', 'parent']);
  });

  it('allows only approve / reject on a pending agent draft', () => {
    expect(sorted('pending')).toEqual(['approve', 'reject']);
  });
});
