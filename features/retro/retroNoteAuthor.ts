import type { TrackerMyselfUser } from '@/lib/api/types';
import type { RetroCommentAuthor } from '@/lib/retro/retroBoard';

import { DEMO_DEV_DISPLAY } from '@/lib/demo/demoFixtureSeedTasks';
import { DEMO_DEV_ALICE } from '@/lib/demo/demoIds';

import { currentRetroCommentAuthor } from './components/RetroCommentItem';

/** В демо нет сессии Tracker, поэтому новая заметка подписывается фикстурным автором. */
export function retroNoteAuthor(
  user: TrackerMyselfUser | undefined,
  isDemoPlanner: boolean
): RetroCommentAuthor {
  if (!isDemoPlanner) return currentRetroCommentAuthor(user);
  return {
    avatarUrl: DEMO_DEV_DISPLAY.alice.avatarUrl,
    name: DEMO_DEV_DISPLAY.alice.name,
    userId: DEMO_DEV_ALICE,
  };
}
