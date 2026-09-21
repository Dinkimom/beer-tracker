import type { QuickAddDraftKind, QuickAddMode } from './types';

interface QuickAddDraftTextFields {
  caption: string;
  comment: string;
  diagramName: string;
  title: string;
}

export function quickAddModeToDraftKind(mode: QuickAddMode): QuickAddDraftKind {
  if (mode === 'comment') {
    return 'comment';
  }
  if (mode === 'diagram') {
    return 'diagram';
  }
  if (mode === 'image') {
    return 'image';
  }
  if (mode === 'existing') {
    return 'existing';
  }
  return 'task';
}

export function quickAddDraftKindToMode(
  kind: QuickAddDraftKind | undefined,
  imageUrl?: string
): QuickAddMode {
  if (kind === 'comment') {
    return 'comment';
  }
  if (kind === 'diagram') {
    return 'diagram';
  }
  if (kind === 'image') {
    return 'image';
  }
  if (kind === 'existing') {
    return 'existing';
  }
  if (imageUrl) {
    return 'image';
  }
  return 'new';
}

export function splitQuickAddDraftFields(input: {
  draftKind?: QuickAddDraftKind;
  imageUrl?: string;
  lockedMode?: Exclude<QuickAddMode, 'existing'>;
  title: string;
}): QuickAddDraftTextFields {
  const mode = input.lockedMode ?? quickAddDraftKindToMode(input.draftKind, input.imageUrl);
  if (mode === 'comment') {
    return { caption: '', comment: input.title, diagramName: '', title: '' };
  }
  if (mode === 'diagram') {
    return { caption: '', comment: '', diagramName: input.title, title: '' };
  }
  if (mode === 'image') {
    return { caption: input.title, comment: '', diagramName: '', title: '' };
  }
  return { caption: '', comment: '', diagramName: '', title: input.title };
}

export function resolveQuickAddGhostText(
  mode: QuickAddMode,
  fields: QuickAddDraftTextFields
): string {
  if (mode === 'comment') {
    return fields.comment;
  }
  if (mode === 'diagram') {
    return fields.diagramName;
  }
  if (mode === 'image') {
    return fields.caption;
  }
  if (mode === 'existing') {
    return '';
  }
  if (mode === 'availability' || mode === 'draft' || mode === 'pasteNote') {
    return '';
  }
  return fields.title;
}
