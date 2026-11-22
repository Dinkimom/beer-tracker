'use client';

import type { QuarterlyPlanRowActions } from '../quarterlyPlanMenuSections';
import type { QuarterlyPlanContent } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';

import { useI18n } from '@/contexts/LanguageContext';

import { useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import { buildQuarterlyPlanMenuSections } from '../quarterlyPlanMenuSections';

import { QuarterlyPlanMenu } from './QuarterlyPlanMenu';

interface QuarterlyPlanBoardMenuProps {
  actions: QuarterlyPlanRowActions;
  applyEdit: (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => void;
}

/** Открытое меню доски (`QuarterBoardMenu`): перерисовывается само, страница при открытии меню — нет. */
export const QuarterlyPlanBoardMenu = observer(function QuarterlyPlanBoardMenu({ actions, applyEdit }: QuarterlyPlanBoardMenuProps) {
  const { t } = useI18n();
  const { menu } = useQuarterlyPlanBoard();
  const { absenceByMember, plan, weeks } = useQuarterPlanView();
  const { shown } = menu;
  if (!shown) return null;
  return (
    <QuarterlyPlanMenu
      anchor={shown.anchor}
      open={menu.current !== null}
      sections={buildQuarterlyPlanMenuSections({ absenceByMember, actions, applyEdit, menu: shown, plan, t, weeks })}
      onClose={(reason) => menu.close(reason === 'select' ? 'select' : undefined)}
    />
  );
});
