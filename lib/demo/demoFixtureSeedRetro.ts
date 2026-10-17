import type { RetroBoard } from '@/lib/retro/retroBoardShared';

import { defaultRetroColumnTemplate } from '@/lib/retro/retroBoard';

import { DEMO_DEV_DISPLAY } from './demoFixtureSeedTasks';
import {
  DEMO_DEV_ALICE,
  DEMO_DEV_BOB,
  DEMO_DEV_CAROL,
  DEMO_SPRINT_ID,
  DEMO_SPRINT_PREV_ID,
} from './demoIds';

export function buildDemoRetroBoards(): Record<string, RetroBoard> {
  const columns = defaultRetroColumnTemplate();
  const gladId = columns.find((c) => c.preset === 'glad')?.id ?? 'glad';
  const sadId = columns.find((c) => c.preset === 'sad')?.id ?? 'sad';
  const discussId = columns.find((c) => c.preset === 'discuss')?.id ?? 'discuss';
  const agreementsId = columns.find((c) => c.role === 'agreements')?.id ?? 'agreements';

  return {
    [String(DEMO_SPRINT_PREV_ID)]: {
      sprintId: DEMO_SPRINT_PREV_ID,
      columns: columns.map((c) => ({ ...c })),
      cards: [
        {
          id: 'retro-prev-1',
          columnId: agreementsId,
          kind: 'agreement',
          text: 'Ship behind a feature flag',
          color: 'yellow',
          comments: [],
          reactions: [],
          carriesToNext: true,
          createdAt: '2026-10-10T12:00:00.000Z',
          imageDataUrl: null,
          originSprintId: DEMO_SPRINT_PREV_ID,
        },
      ],
    },
    [String(DEMO_SPRINT_ID)]: {
      sprintId: DEMO_SPRINT_ID,
      columns: columns.map((c) => ({ ...c })),
      cards: [
        {
          id: 'retro-1',
          columnId: gladId,
          kind: 'note',
          text: 'Pairing on the payment edge cases worked well',
          color: 'green',
          comments: [],
          reactions: [
            { emoji: '👍', userId: DEMO_DEV_BOB, userName: DEMO_DEV_DISPLAY.bob.name },
            { emoji: '👍', userId: DEMO_DEV_CAROL, userName: DEMO_DEV_DISPLAY.carol.name },
            { emoji: '🎉', userId: DEMO_DEV_ALICE, userName: DEMO_DEV_DISPLAY.alice.name },
          ],
          carriesToNext: false,
          createdAt: '2026-10-16T10:00:00.000Z',
          imageDataUrl: null,
          originSprintId: DEMO_SPRINT_ID,
        },
        {
          id: 'retro-2',
          columnId: sadId,
          kind: 'note',
          text: 'Flaky CI slowed the merge train',
          color: 'pink',
          comments: [],
          reactions: [
            { emoji: '😢', userId: DEMO_DEV_ALICE, userName: DEMO_DEV_DISPLAY.alice.name },
            { emoji: '👍', userId: DEMO_DEV_BOB, userName: DEMO_DEV_DISPLAY.bob.name },
          ],
          carriesToNext: false,
          createdAt: '2026-10-16T10:05:00.000Z',
          imageDataUrl: null,
          originSprintId: DEMO_SPRINT_ID,
        },
        {
          id: 'retro-3',
          columnId: discussId,
          kind: 'note',
          text: 'Do we need a dedicated QA lane next sprint?',
          color: 'blue',
          comments: [
            {
              id: 'rc-1',
              authorName: DEMO_DEV_DISPLAY.alice.name,
              createdAt: '2026-10-16T11:00:00.000Z',
              text: 'Worth trying for one sprint',
            },
          ],
          reactions: [
            { emoji: '🤔', userId: DEMO_DEV_BOB, userName: DEMO_DEV_DISPLAY.bob.name },
            { emoji: '👍', userId: DEMO_DEV_CAROL, userName: DEMO_DEV_DISPLAY.carol.name },
            { emoji: '👍', userId: DEMO_DEV_ALICE, userName: DEMO_DEV_DISPLAY.alice.name },
          ],
          carriesToNext: false,
          createdAt: '2026-10-16T10:10:00.000Z',
          imageDataUrl: null,
          originSprintId: DEMO_SPRINT_ID,
        },
      ],
    },
  };
}
