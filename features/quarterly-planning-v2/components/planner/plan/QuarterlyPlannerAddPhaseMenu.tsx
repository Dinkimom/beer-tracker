'use client';

import type { QuarterlyPlanPhaseKind } from '../../../types';
import type { QuarterlyPlannerCellMenuAnchor } from '../../../utils/quarterlyPlannerCellMenuAnchor';

import { useI18n } from '@/contexts/LanguageContext';

import { QuarterlyPlannerCellPopover } from './QuarterlyPlannerCellPopover';

export interface QuarterlyPlannerAddPhaseMenuState extends QuarterlyPlannerCellMenuAnchor {
  weekIndex: number;
}

interface QuarterlyPlannerAddPhaseMenuProps {
  canAddDelivery: boolean;
  canAddDiscovery: boolean;
  menu: QuarterlyPlannerAddPhaseMenuState | null;
  onAddPhase: (kind: QuarterlyPlanPhaseKind, weekIndex: number) => void;
  onClose: () => void;
}

/** Меню выбора типа фазы по клику в пустую недельную ячейку. */
export function QuarterlyPlannerAddPhaseMenu({
  menu,
  onClose,
  onAddPhase,
  canAddDelivery,
  canAddDiscovery,
}: QuarterlyPlannerAddPhaseMenuProps) {
  const { t } = useI18n();

  if (!menu) return null;

  const itemClass = (enabled: boolean) =>
    `block w-full px-3 py-1.5 text-left text-sm ${
      enabled
        ? 'text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700 cursor-pointer'
        : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
    }`;

  return (
    <QuarterlyPlannerCellPopover
      anchor={menu}
      contentClassName="min-w-[180px]"
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <div role="menu">
        <button
          className={itemClass(canAddDelivery)}
          disabled={!canAddDelivery}
          role="menuitem"
          type="button"
          onClick={() => {
            if (!canAddDelivery) return;
            onAddPhase('delivery', menu.weekIndex);
            onClose();
          }}
        >
          {t('planning.quarterlyV2.addDeliveryPhase')}
        </button>
        <button
          className={itemClass(canAddDiscovery)}
          disabled={!canAddDiscovery}
          role="menuitem"
          type="button"
          onClick={() => {
            if (!canAddDiscovery) return;
            onAddPhase('discovery', menu.weekIndex);
            onClose();
          }}
        >
          {t('planning.quarterlyV2.addDiscoveryPhase')}
        </button>
      </div>
    </QuarterlyPlannerCellPopover>
  );
}
