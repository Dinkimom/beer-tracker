'use client';

import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { MENU_QUICK_ACTION, MENU_QUICK_ACTION_LABEL } from '@/features/context-menu/contextMenuClasses';

/**
 * «Агенту» в меню карточки: чат с плашкой задачи. Там же — спросить про задачу или сразу отдать её
 * агенту сделать в коде («Сделать в коде» в пустом чате): один вход вместо двух кнопок.
 */
export function ContextMenuAgentActions({
  task,
  onAskAgent,
  onClose,
}: {
  task: Task;
  onAskAgent?: (task: Task) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const actions = [
    onAskAgent && { icon: 'sparkles', label: t('agentSession.menuShort'), marker: 'ask', run: onAskAgent, title: t('agentSession.menuAria') },
  ].filter((action) => !!action);

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
}
