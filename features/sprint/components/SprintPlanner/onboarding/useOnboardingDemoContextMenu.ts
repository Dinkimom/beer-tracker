'use client';

import type { SprintPlannerContextMenuState } from '@/lib/layers';

import { useEffect } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useRootStore } from '@/lib/layers';
import {
  ONBOARDING_SAMPLE_TASK_ID,
  buildOnboardingSampleTask,
} from '@/lib/plannerOnboarding/onboardingDemoLane';

const MENU_SELECTOR = '[data-onboarding-context-menu]';

/** Открывает настоящее контекстное меню у демо-карточки и просит тур перемерить его рамку. */
export function useOnboardingDemoContextMenu(active: boolean): void {
  const { sprintPlannerUi } = useRootStore();
  const { t } = useI18n();
  const taskName = t('sprintPlanner.onboarding.sampleTaskName');

  useEffect(() => {
    if (!active) {
      closeDemoContextMenu(sprintPlannerUi);
      return;
    }

    const frame = requestAnimationFrame(() => {
      openDemoContextMenu(sprintPlannerUi, taskName);
      window.dispatchEvent(new Event('resize'));
    });
    const resizeObserver = new ResizeObserver(notifyTourMeasure);
    const attributeObserver = new MutationObserver(notifyTourMeasure);
    const appearance = new MutationObserver(() => {
      const menu = document.querySelector(MENU_SELECTOR);
      if (!(menu instanceof HTMLElement)) {
        return;
      }
      resizeObserver.observe(menu);
      attributeObserver.observe(menu, { attributeFilter: ['style'], attributes: true });
      appearance.disconnect();
      notifyTourMeasure();
    });
    appearance.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      appearance.disconnect();
      resizeObserver.disconnect();
      attributeObserver.disconnect();
      closeDemoContextMenu(sprintPlannerUi);
    };
  }, [active, sprintPlannerUi, taskName]);
}

function notifyTourMeasure(): void {
  window.dispatchEvent(new Event('resize'));
}

interface DemoMenuStore {
  contextMenu: { task: { id: string } } | null;
  closeContextMenu: () => void;
  setContextMenu: (menu: SprintPlannerContextMenuState) => void;
  setContextMenuTaskId: (id: string | null) => void;
}

function openDemoContextMenu(sprintPlannerUi: DemoMenuStore, taskName: string): void {
  const card = document.getElementById(`task-${ONBOARDING_SAMPLE_TASK_ID}`);
  if (!(card instanceof HTMLElement)) {
    return;
  }
  const rect = card.getBoundingClientRect();
  sprintPlannerUi.setContextMenuTaskId(ONBOARDING_SAMPLE_TASK_ID);
  sprintPlannerUi.setContextMenu({
    anchorElementId: card.id,
    anchorRect: {
      bottom: rect.bottom,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      width: rect.width,
    },
    dimPeerUi: false,
    position: { x: rect.right + 8, y: rect.top },
    task: buildOnboardingSampleTask(taskName),
  });
}

function closeDemoContextMenu(sprintPlannerUi: DemoMenuStore): void {
  if (sprintPlannerUi.contextMenu?.task.id !== ONBOARDING_SAMPLE_TASK_ID) {
    return;
  }
  sprintPlannerUi.closeContextMenu();
}
