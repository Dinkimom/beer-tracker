'use client';

import type { StoryPhasePosition } from '../../../types';

import { useEffect } from 'react';

import { useI18n } from '@/contexts/LanguageContext';

export interface QuarterlyPlannerPhaseDeleteMenuState {
  clientX: number;
  clientY: number;
  phase: StoryPhasePosition;
}

interface QuarterlyPlannerPhaseDeleteMenuProps {
  menu: QuarterlyPlannerPhaseDeleteMenuState | null;
  onClose: () => void;
  onDeletePhase: (phaseId: string) => void;
}

/** Удаление фазы по ПКМ на полосе плана. */
export function QuarterlyPlannerPhaseDeleteMenu({
  menu,
  onClose,
  onDeletePhase,
}: QuarterlyPlannerPhaseDeleteMenuProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu, onClose]);

  if (!menu) return null;

  return (
    <>
      <button
        aria-label={t('planning.quarterlyV2.closePhaseMenuAria')}
        className="fixed inset-0 z-[200] cursor-default bg-transparent"
        type="button"
        onClick={onClose}
      />
      <div
        className="fixed z-[201] min-w-[160px] rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
        role="menu"
        style={{ left: menu.clientX, top: menu.clientY }}
      >
        <button
          className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
          role="menuitem"
          type="button"
          onClick={() => {
            onDeletePhase(menu.phase.id);
            onClose();
          }}
        >
          {t('planning.quarterlyV2.deletePhase')}
        </button>
      </div>
    </>
  );
}
