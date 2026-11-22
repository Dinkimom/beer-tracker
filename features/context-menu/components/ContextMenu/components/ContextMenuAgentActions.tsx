'use client';

import type { Task } from '@/types';

import { observer } from 'mobx-react-lite';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { MENU_QUICK_ACTION, MENU_QUICK_ACTION_LABEL } from '@/features/context-menu/contextMenuClasses';
import { useRootStore } from '@/lib/layers';

/**
 * «Агенту» в меню карточки: чат с плашкой задачи. Там же — спросить про задачу или сразу отдать её
 * агенту сделать в коде («Сделать в коде» в пустом чате): один вход вместо двух кнопок.
 */
export const ContextMenuAgentActions = observer(function ContextMenuAgentActions({ task, onClose }: { task: Task; onClose: () => void }) {
  const { t } = useI18n();
  const { agentChat } = useRootStore().sprintPlannerUi;
  const actions = [
    {
      icon: 'sparkles',
      label: t('agentSession.menuShort'),
      marker: 'ask',
      run: (target: Task) => agentChat.setAgentRequestTarget({ kind: 'task', task: target }),
      title: t('agentSession.menuAria'),
    },
  ];

  return actions.map((action) => (
    <Button
      key={action.marker}
      aria-label={action.title}
      className={MENU_QUICK_ACTION}
      data-context-menu-agent-action={action.marker}
      title={action.title}
      type="button"
      variant="ghost"
      onClick={(e) => {
        e.stopPropagation();
        action.run(task);
        onClose();
      }}
    >
      <Icon className="h-4 w-4 shrink-0" name={action.icon} />
      <span className={MENU_QUICK_ACTION_LABEL}>{action.label}</span>
    </Button>
  ));
});
