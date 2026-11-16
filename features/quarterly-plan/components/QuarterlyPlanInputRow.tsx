'use client';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { QUARTER_ROW_HEIGHT_PX, QUARTER_ROW_INDENT_CLASS, type QuarterRowLevel } from '../quarterlyPlanBoardModel';

import { QuarterlyPlanInlineInput } from './QuarterlyPlanInlineInput';
import { QuarterlyPlanRow } from './QuarterlyPlanRow';

interface QuarterlyPlanInputRowProps {
  /** Уровень новой строки: поле стоит с её отступом. */
  level: QuarterRowLevel;
  placeholder: string;
}

/** Строка с полем названия новой строки плана — на том месте, куда строка встанет (QO1). */
export function QuarterlyPlanInputRow({ level, placeholder }: QuarterlyPlanInputRowProps) {
  const { onDraftSubmit } = useQuarterlyPlanBoard();
  return (
    <QuarterlyPlanRow
      heightPx={QUARTER_ROW_HEIGHT_PX}
      left={
        <div className={`flex min-w-0 flex-1 pr-2 ${QUARTER_ROW_INDENT_CLASS[level]}`}>
          <QuarterlyPlanInlineInput placeholder={placeholder} onSubmit={onDraftSubmit} />
        </div>
      }
      tone={level === 'direction' ? 'direction' : 'default'}
    />
  );
}
