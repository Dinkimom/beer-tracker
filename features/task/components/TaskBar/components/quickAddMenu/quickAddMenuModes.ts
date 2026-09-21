import type {
  QuickAddDraftKind,
  QuickAddMode,
  QuickAddPickerItem,
} from './types';

const QUICK_ADD_MODES: readonly QuickAddMode[] = [
  'pasteNote',
  'new',
  'existing',
  'comment',
  'image',
  'diagram',
  'availability',
];

export function filterQuickAddVisibleModes(input: {
  annotationModesEnabled?: boolean;
  availabilityModeEnabled?: boolean;
  commentModeEnabled: boolean;
  imageModeEnabled: boolean;
  pasteNoteEnabled?: boolean;
  taskModesEnabled?: boolean;
}): QuickAddMode[] {
  const taskModesEnabled = input.taskModesEnabled !== false;
  const annotationModesEnabled = input.annotationModesEnabled ?? !taskModesEnabled;
  return QUICK_ADD_MODES.filter((mode) => {
    if (mode === 'pasteNote') {
      return input.pasteNoteEnabled === true && input.commentModeEnabled;
    }
    if (mode === 'new' || mode === 'existing') {
      return taskModesEnabled;
    }
    if (mode === 'availability') {
      return input.availabilityModeEnabled === true;
    }
    if (mode === 'comment' || mode === 'diagram') {
      return annotationModesEnabled && input.commentModeEnabled;
    }
    if (mode === 'image') {
      return annotationModesEnabled && input.imageModeEnabled;
    }
    return true;
  });
}

const QUICK_ADD_MODE_MESSAGE_KEYS: Record<QuickAddMode, string> = {
  availability: 'sprintPlanner.swimlane.quickAddMenu.modeAvailability',
  comment: 'sprintPlanner.swimlane.quickAddMenu.modeComment',
  diagram: 'sprintPlanner.swimlane.quickAddMenu.modeDiagram',
  draft: 'sprintPlanner.featureLanes.addModeDraft',
  existing: 'sprintPlanner.swimlane.quickAddMenu.modeExisting',
  image: 'sprintPlanner.swimlane.quickAddMenu.modeImage',
  new: 'sprintPlanner.swimlane.quickAddMenu.modeNew',
  pasteNote: 'sprintPlanner.swimlane.quickAddMenu.modePasteNote',
};

const QUICK_ADD_MODE_ICONS: Record<QuickAddMode, string> = {
  availability: 'calendar',
  comment: 'sticky-note',
  diagram: 'diagram',
  draft: 'draft',
  existing: 'search',
  image: 'image',
  new: 'issue-task',
  pasteNote: 'copy',
};

export function quickAddModeMessageKey(mode: QuickAddMode): string {
  return QUICK_ADD_MODE_MESSAGE_KEYS[mode];
}

export function quickAddModeIconName(mode: QuickAddMode): string {
  return QUICK_ADD_MODE_ICONS[mode];
}

export function resolveQuickAddModeChange(input: {
  canCreateAvailability: boolean;
  canPasteNote: boolean;
  imagesVisible: boolean;
  lockedMode?: Exclude<QuickAddMode, 'existing'>;
  nextMode: QuickAddMode;
  notesVisible: boolean;
}): 'availability' | 'form' | 'noop' | 'paste' {
  if (input.lockedMode) {
    return 'noop';
  }
  if (input.nextMode === 'draft') {
    return 'noop';
  }
  if (input.nextMode === 'availability') {
    return input.canCreateAvailability ? 'availability' : 'noop';
  }
  if (input.nextMode === 'pasteNote') {
    return input.canPasteNote ? 'paste' : 'noop';
  }
  if ((input.nextMode === 'comment' || input.nextMode === 'diagram') && !input.notesVisible) {
    return 'noop';
  }
  if (input.nextMode === 'image' && !input.imagesVisible) {
    return 'noop';
  }
  return 'form';
}

export function shouldOpenQuickAddKindPicker(input: {
  draftKind?: QuickAddDraftKind;
  imageUrl?: string;
  lockedMode?: Exclude<QuickAddMode, 'existing'>;
}): boolean {
  if (input.lockedMode || input.imageUrl) {
    return false;
  }
  return input.draftKind == null;
}

export function shouldShowQuickAddBootstrapLoader(
  isInitialLoading: boolean,
  mode: QuickAddMode,
  step: 'form' | 'picker'
): boolean {
  if (step !== 'form' || !isInitialLoading) {
    return false;
  }
  return mode === 'new' || mode === 'existing';
}

const ANNOTATION_MODE_ORDER = ['comment', 'image', 'diagram'] as const;

export function buildQuickAddRootPickerItems(
  modes: readonly QuickAddMode[]
): QuickAddPickerItem[] {
  const items: QuickAddPickerItem[] = [];
  if (modes.includes('pasteNote')) {
    items.push({ kind: 'mode', mode: 'pasteNote' });
  }
  if (modes.includes('new')) {
    items.push({ kind: 'mode', mode: 'new' });
  }
  if (modes.includes('existing')) {
    items.push({ kind: 'mode', mode: 'existing' });
  }
  const annotationModes = ANNOTATION_MODE_ORDER.filter((mode) => modes.includes(mode));
  const hasAvailability = modes.includes('availability');
  if (items.length > 0 && (annotationModes.length > 0 || hasAvailability)) {
    items.push({ kind: 'separator' });
  }
  for (const mode of annotationModes) {
    items.push({ kind: 'mode', mode });
  }
  if (hasAvailability) {
    items.push({ kind: 'mode', mode: 'availability' });
  }
  return items;
}

export function quickAddPickerSelectableIds(
  items: readonly QuickAddPickerItem[]
): QuickAddMode[] {
  return items.flatMap((item) => (item.kind === 'mode' ? [item.mode] : []));
}
