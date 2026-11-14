'use client';

import type { QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { ReactNode } from 'react';

import { Icon } from '@/components/Icon';
import {
  MENU_PANEL_PADDING,
  MENU_ROW,
  MENU_ROW_CHECK,
  MENU_ROW_DESTRUCTIVE,
  MENU_SECTION_LABEL,
  MENU_SEPARATOR,
} from '@/features/context-menu/contextMenuClasses';

import { QuarterlyPlanAnchoredPopover } from './QuarterlyPlanAnchoredPopover';

export interface QuarterlyPlanMenuRow {
  checked?: boolean;
  destructive?: boolean;
  /** Приглушённая пометка справа от подписи: «отсутствует», «уже занят». */
  hint?: string;
  /** Иконка или аватар перед подписью. */
  icon?: ReactNode;
  id: string;
  /** Пункт сам меняет содержимое меню (следующий шаг выбора) — закрывать его не нужно. */
  keepOpen?: boolean;
  label: string;
  onSelect: () => void;
}

export interface QuarterlyPlanMenuSection {
  id: string;
  label?: string;
  rows: QuarterlyPlanMenuRow[];
}

interface QuarterlyPlanMenuProps {
  anchor: QuarterMenuAnchor;
  sections: QuarterlyPlanMenuSection[];
  onClose: () => void;
}

/** Меню у точки клика: выбор исполнителя, статуса или действия над полосой. */
export function QuarterlyPlanMenu({ anchor, sections, onClose }: QuarterlyPlanMenuProps) {
  return (
    <QuarterlyPlanAnchoredPopover
      anchor={anchor}
      className={`max-h-[60vh] min-w-[220px] overflow-y-auto ${MENU_PANEL_PADDING}`}
      onDismiss={onClose}
    >
          {sections.map((section, index) => (
            <div key={section.id}>
              {index > 0 ? <div className={MENU_SEPARATOR} /> : null}
              {section.label ? <div className={MENU_SECTION_LABEL}>{section.label}</div> : null}
              {section.rows.map((row) => (
                <button
                  key={row.id}
                  className={`${row.destructive ? MENU_ROW_DESTRUCTIVE : MENU_ROW} transition-colors`}
                  type="button"
                  onClick={() => {
                    row.onSelect();
                    if (!row.keepOpen) onClose();
                  }}
                >
                  {row.icon}
                  <span className="min-w-0 flex-1 truncate">{row.label}</span>
                  {row.hint ? (
                    <span className="shrink-0 text-xs text-amber-700 dark:text-amber-300">{row.hint}</span>
                  ) : null}
                  {row.checked ? <Icon className={MENU_ROW_CHECK} name="check" /> : null}
                </button>
              ))}
            </div>
          ))}
    </QuarterlyPlanAnchoredPopover>
  );
}
