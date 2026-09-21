'use client';

import type { StoryEventsByStory } from '../../../types';
import type { Developer } from '@/types';
import type { IssueComment } from '@/types/tracker';

import { getStoryEventForWeek } from '../../../utils/storyEventsMap';

import { QuarterlyPlannerWeekCommentCorner } from './QuarterlyPlannerWeekCommentCorner';
import { QuarterlyPlannerWeekEventMarker } from './QuarterlyPlannerWeekEventMarker';

interface QuarterlyPlannerPlanFactWeekOverlayProps {
  developerMap: Map<string, Developer>;
  isEditingPlan: boolean;
  issueCommentsByWeek?: Map<number, IssueComment[]>;
  storyEventsByStory: StoryEventsByStory;
  storyKey: string;
  weekIndex: number;
  onOpenEventMenu: (weekIndex: number, anchorEl: HTMLElement) => void;
}

export function QuarterlyPlannerPlanFactWeekOverlay({
  developerMap,
  isEditingPlan,
  issueCommentsByWeek,
  onOpenEventMenu,
  storyEventsByStory,
  storyKey,
  weekIndex,
}: QuarterlyPlannerPlanFactWeekOverlayProps) {
  const issueCommentsInWeek = issueCommentsByWeek?.get(weekIndex) ?? [];
  const event = getStoryEventForWeek(storyEventsByStory, storyKey, weekIndex);

  return (
    <>
      {event ? (
        <QuarterlyPlannerWeekEventMarker
          event={event}
          interactive={!isEditingPlan}
          onClick={
            isEditingPlan ? undefined : (e) => onOpenEventMenu(weekIndex, e.currentTarget)
          }
        />
      ) : null}
      {issueCommentsInWeek.length > 0 ? (
        <QuarterlyPlannerWeekCommentCorner
          comments={issueCommentsInWeek}
          developerMap={developerMap}
        />
      ) : null}
    </>
  );
}
