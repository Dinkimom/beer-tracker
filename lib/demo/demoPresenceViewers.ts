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
