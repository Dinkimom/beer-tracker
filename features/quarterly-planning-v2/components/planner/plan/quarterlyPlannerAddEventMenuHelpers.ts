import type { StoryEventMenuFollowUpHint } from '../../../utils/quarterlyStoryEventPlacement';

type Translate = (key: string) => string;

export function quarterlyStoryEventFollowUpHintText(
  followUpHint: StoryEventMenuFollowUpHint | null,
  t: Translate
): string | null {
  if (followUpHint === 'releaseExpected') {
    return t('planning.quarterlyV2.storyEventReleaseExpectedFollowUpHint');
  }
  if (followUpHint === 'releaseSucceeded') {
    return t('planning.quarterlyV2.storyEventReleaseSucceededTerminalHint');
  }
  return null;
}

export function quarterlyPlannerWeekAddCellTitle(
  canEditFact: boolean,
  hasEvent: boolean,
  t: Translate
): string | undefined {
  if (!canEditFact) {
    return undefined;
  }
  if (hasEvent) {
    return t('planning.quarterlyV2.editStoryEventOnCellTitle');
  }
  return t('planning.quarterlyV2.addStoryEventOnCellTitle');
}
