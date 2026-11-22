'use client';

import type { QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';
import { Fragment } from 'react';

import { useI18n } from '@/contexts/LanguageContext';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';

import { QuarterlyPlanEpicGroup } from './QuarterlyPlanEpicGroup';
import { QuarterlyPlanInputRow } from './QuarterlyPlanInputRow';

interface QuarterlyPlanDirectionEpicsProps {
  /** Свёрнутое направление эпики не показывает, но поле нового эпика — показывает. */
  collapsed: boolean;
  directionId: string;
  /** Эпики направления (без задач) после фильтров. */
  epics: readonly QuarterlyPlanEpic[];
}

/**
 * Эпики направления с их задачами. Поле нового эпика стоит под эпиком, из меню которого его добавили
 * (QO1); если того нет на экране или эпик добавили через «+» — в конце направления.
 */
export const QuarterlyPlanDirectionEpics = observer(function QuarterlyPlanDirectionEpics({ collapsed, directionId, epics }: QuarterlyPlanDirectionEpicsProps) {
  const { t } = useI18n();
  const { rows } = useQuarterlyPlanBoard();
  const { draft } = rows;
  const shown = collapsed ? [] : epics;
  const adding = draft?.kind === 'newEpic' && draft.directionId === directionId && !draft.parentEpicId ? draft : null;
  const afterId = shown.find((epic) => epic.id === adding?.afterId)?.id;
  const input = <QuarterlyPlanInputRow level="epic" placeholder={t('quarterlyPlan.addEpicPlaceholder')} />;

  return (
    <>
      {shown.map((epic) => (
        <Fragment key={epic.id}>
          <QuarterlyPlanEpicGroup epic={epic} />
          {afterId === epic.id ? input : null}
        </Fragment>
      ))}
      {adding && !afterId ? input : null}
    </>
  );
});
