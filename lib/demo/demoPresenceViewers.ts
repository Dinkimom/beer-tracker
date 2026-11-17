import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';

import { DEMO_DEV_DISPLAY } from './demoFixtureSeedTasks';

/** Two colleagues already on the demo board (header stack + card avatars). One is resizing, so that card shows the action outline. */
export function buildDemoPresenceViewers(): SprintPresenceViewer[] {
  return [
    {
      attention: 'active',
      avatarUrl: DEMO_DEV_DISPLAY.carol.avatarUrl,
      boardView: 'swimlanes',
      clientId: 'demo-presence-carol',
      displayName: DEMO_DEV_DISPLAY.carol.name,
      focus: { state: 'resizing', targetId: 'DEMO-102' },
      userId: 'demo-presence-carol',
    },
    {
      attention: 'active',
      avatarUrl: DEMO_DEV_DISPLAY.alice.avatarUrl,
      boardView: 'swimlanes',
      clientId: 'demo-presence-alice',
      displayName: DEMO_DEV_DISPLAY.alice.name,
      focus: { state: 'viewing', targetId: 'DEMO-107' },
      userId: 'demo-presence-alice',
    },
  ];
}

/** Строки `DEMO_DEV_DISPLAY`, которыми демо показывает коллег на доске. */
type DemoColleague = keyof typeof DEMO_DEV_DISPLAY;

function demoQuarterViewer(colleague: DemoColleague, focus: SprintPresenceViewer['focus']): SprintPresenceViewer {
  return {
    attention: 'active',
    avatarUrl: DEMO_DEV_DISPLAY[colleague].avatarUrl,
    clientId: `demo-presence-${colleague}`,
    displayName: DEMO_DEV_DISPLAY[colleague].name,
    focus,
    userId: `demo-presence-${colleague}`,
  };
}

/**
 * Коллеги на квартальном плане демо (QS7): одна растягивает полосу, другой редактирует заметку —
 * обе обведены их цветом и заняты; третий просто смотрит на полосу. Цели — из сида плана Q4 2026.
 */
export function buildDemoQuarterPresenceViewers(): SprintPresenceViewer[] {
  return [
    demoQuarterViewer('carol', { state: 'resizing', targetId: 'demo-direction-1-epic-3-a1' }),
    demoQuarterViewer('alice', { state: 'editing', targetId: 'demo-quarter-note-promo' }),
    demoQuarterViewer('dana', { state: 'viewing', targetId: 'demo-direction-2-epic-1-a1' }),
  ];
}
