'use client';

import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { MENU_QUICK_ACTION, MENU_QUICK_ACTION_LABEL } from '@/features/context-menu/contextMenuClasses';

/**
 * Быстрые действия агента в меню карточки: «Агенту» — спросить про задачу в чате (плашка в поле
 * ввода), «Код» — отдать задачу агенту реализовать в коде (сессия разработки).
 */
export function ContextMenuAgentActions({
  task,
  onAskAgent,
  onClose,
  onDelegateToAgent,
}: {
  task: Task;
  onAskAgent?: (task: Task) => void;
  onClose: () => void;
  onDelegateToAgent?: (task: Task) => void;
}) {
  const { t } = useI18n();
  const actions = [
    onAskAgent && { icon: 'sparkles', label: t('agentSession.menuShort'), marker: 'ask', run: onAskAgent, title: t('agentSession.menuAria') },
    onDelegateToAgent && {
      icon: 'code',
      label: t('agentSession.devMenuShort'),
      marker: 'delegate',
      run: onDelegateToAgent,
      title: t('agentSession.devMenuAria'),
    },
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
