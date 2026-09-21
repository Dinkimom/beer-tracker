import { describe, expect, it, vi } from 'vitest';

import {
  resolveDiagramNameChangeHandler,
  resolveTaskBarAnnotationChrome,
  resolveTaskBarCardClick,
} from './taskBarAnnotationChrome';

const idle = {
  effectiveIsDragging: false,
  hasCommentDelete: true,
  hasImageDelete: true,
  isResizing: false,
  quickAddMenu: null,
  quickAddSubmitting: false,
};

describe('resolveTaskBarAnnotationChrome', () => {
  it('deletes a saved photo via the comment API, not the local-image control', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        isPhotoCard: true,
        isStickyNoteCard: false,
        swimlaneCommentId: 'c1',
      })
    ).toMatchObject({
      showCommentDelete: true,
      showImageDelete: false,
      showStickyNoteReactions: true,
    });
  });

  it('shows the local-image delete control for committed unsaved photos, not drafts', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        isPhotoCard: true,
        isStickyNoteCard: false,
        swimlaneCommentId: null,
      })
    ).toMatchObject({
      showCommentDelete: false,
      showImageDelete: true,
      showStickyNoteReactions: false,
    });
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        isLocalTask: true,
        isPhotoCard: true,
        isStickyNoteCard: false,
        swimlaneCommentId: null,
      }).showImageDelete
    ).toBe(false);
  });

  it('shows sticky-note reactions on saved photo cards', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        isPhotoCard: true,
        isStickyNoteCard: false,
        swimlaneCommentId: 'c1',
      }).showStickyNoteReactions
    ).toBe(true);
  });

  it('shows delete on an unsaved note draft', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        isLocalTask: true,
        isPhotoCard: false,
        isStickyNoteCard: true,
        swimlaneCommentId: null,
      })
    ).toMatchObject({
      showCommentDelete: false,
      showDraftNoteDelete: true,
      showImageDelete: false,
    });
  });

  it('hides card controls while linking cards', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        isDiagramCard: true,
        isLinkingSession: true,
        isPhotoCard: false,
        isStickyNoteCard: true,
        swimlaneCommentId: 'c1',
      })
    ).toMatchObject({
      showCommentDelete: false,
      showDraftNoteDelete: false,
      showImageDelete: false,
      showStickyNoteReactions: false,
    });
  });

  it('hides delete controls when another user is changing the card', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        isPhotoCard: true,
        isStickyNoteCard: false,
        presenceLocked: true,
        swimlaneCommentId: 'c1',
      })
    ).toMatchObject({
      showCommentDelete: false,
      showImageDelete: false,
      showStickyNoteReactions: true,
    });
  });

  it('hides photo-card reactions while the quick-add menu is open', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        isPhotoCard: true,
        isStickyNoteCard: false,
        quickAddMenu: {},
        swimlaneCommentId: 'c1',
      }).showStickyNoteReactions
    ).toBe(false);
  });

  it('hides note chrome while the card is being edited inline', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        inlineTitleEditor: {},
        isPhotoCard: false,
        isStickyNoteCard: true,
        swimlaneCommentId: 'c1',
      })
    ).toMatchObject({
      showCommentDelete: false,
      showStickyNoteReactions: false,
    });
  });

  it('hides the on-card draft delete while the note editor is open', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        inlineTitleEditor: {},
        isLocalTask: true,
        isPhotoCard: false,
        isStickyNoteCard: true,
        swimlaneCommentId: null,
      }).showDraftNoteDelete
    ).toBe(false);
  });

  it('shows comment delete on a saved schema card', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        isPhotoCard: false,
        isStickyNoteCard: false,
        swimlaneCommentId: 'c1',
      })
    ).toMatchObject({
      showCommentDelete: true,
      showImageDelete: false,
    });
  });

  it('shows reactions on a saved schema card', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        isDiagramCard: true,
        isPhotoCard: false,
        isStickyNoteCard: false,
        swimlaneCommentId: 'c1',
      }).showStickyNoteReactions
    ).toBe(true);
  });

  it('shows delete on an unsaved diagram draft', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        isDiagramCard: true,
        isLocalTask: true,
        isPhotoCard: false,
        isStickyNoteCard: false,
        swimlaneCommentId: null,
      }).showImageDelete
    ).toBe(true);
  });

  it('hides reactions on an unsaved schema draft', () => {
    expect(
      resolveTaskBarAnnotationChrome({
        ...idle,
        isDiagramCard: true,
        isPhotoCard: false,
        isStickyNoteCard: false,
        swimlaneCommentId: null,
      }).showStickyNoteReactions
    ).toBe(false);
  });
});

describe('resolveTaskBarCardClick', () => {
  it('opens the photo lightbox instead of the generic card click', () => {
    const openLightbox = vi.fn();
    const onClick = vi.fn();
    const handler = resolveTaskBarCardClick({
      imageUrl: 'blob:photo',
      isDiagramCard: false,
      isPhotoCard: true,
      onClick,
      openLightbox,
    });
    handler?.('task-1');
    expect(openLightbox).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not open the lightbox for an in-progress photo draft', () => {
    const openLightbox = vi.fn();
    const handler = resolveTaskBarCardClick({
      imageUrl: 'blob:photo',
      isDiagramCard: false,
      isLocalTask: true,
      isPhotoCard: true,
      onClick: vi.fn(),
      openLightbox,
    });
    handler?.('local-task-1');
    expect(openLightbox).not.toHaveBeenCalled();
  });

  it('does not open the editor for an in-progress diagram draft', () => {
    const openDiagram = vi.fn();
    const handler = resolveTaskBarCardClick({
      isDiagramCard: true,
      isLocalTask: true,
      isPhotoCard: false,
      onClick: vi.fn(),
      openDiagram,
      openLightbox: vi.fn(),
    });
    handler?.('local-task-1');
    expect(openDiagram).not.toHaveBeenCalled();
  });

  it('opens the diagram editor from a card click', () => {
    const openDiagram = vi.fn();
    const onClick = vi.fn();
    const handler = resolveTaskBarCardClick({
      isDiagramCard: true,
      isPhotoCard: false,
      onClick,
      openDiagram,
      openLightbox: vi.fn(),
    });
    handler?.('task-1');
    expect(openDiagram).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('completes a link instead of opening photo or diagram during linking', () => {
    const onClick = vi.fn();
    const handler = resolveTaskBarCardClick({
      imageUrl: 'blob:photo',
      isDiagramCard: true,
      isLinkingSession: true,
      isPhotoCard: true,
      onClick,
      openDiagram: vi.fn(),
      openLightbox: vi.fn(),
    });
    handler?.('comment:1');
    expect(onClick).toHaveBeenCalledWith('comment:1');
  });
});

describe('resolveDiagramNameChangeHandler', () => {
  it('renames a saved diagram comment', () => {
    const onCommentUpdate = vi.fn();
    const handler = resolveDiagramNameChangeHandler({
      commentId: 'c1',
      isDiagramCard: true,
      onCommentUpdate,
      presenceBlocksMutations: false,
    });
    handler?.('  New  ');
    expect(onCommentUpdate).toHaveBeenCalledWith('c1', 'New');
  });

  it('does not rename while another user holds the card', () => {
    expect(
      resolveDiagramNameChangeHandler({
        commentId: 'c1',
        isDiagramCard: true,
        onCommentUpdate: vi.fn(),
        presenceBlocksMutations: true,
      })
    ).toBeUndefined();
  });
});
