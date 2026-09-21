'use client';

import type { OccupancyViewProps } from './OccupancyView.types';

import { observer } from 'mobx-react-lite';
import { Xwrapper } from 'react-xarrows';

import { useOccupancyViewModel } from './hooks/useOccupancyViewModel';
import { OccupancyXarrowRedrawProvider } from './OccupancyArrowRedrawContext';
import { OccupancyArrowsVisibilityProvider } from './OccupancyArrowsVisibilityCtx';
import { OccupancyScrollCtx } from './OccupancyScrollCtx';
import { OccupancyViewTableSection } from './OccupancyViewTableSection';

export type { SprintInfo } from './OccupancyView.types';

/** @deprecated Скрыт из переключателя видов. Не развивать. */
export const OccupancyView = observer(function OccupancyView(props: OccupancyViewProps) {
  const { occupancyScrollCtxValue, tableSectionProps } = useOccupancyViewModel(props);

  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-white dark:bg-gray-800">
      <Xwrapper>
        <OccupancyXarrowRedrawProvider>
        <OccupancyScrollCtx.Provider value={occupancyScrollCtxValue}>
        <OccupancyArrowsVisibilityProvider>
        <OccupancyViewTableSection {...tableSectionProps} />
        </OccupancyArrowsVisibilityProvider>
        </OccupancyScrollCtx.Provider>
        </OccupancyXarrowRedrawProvider>
      </Xwrapper>
    </div>
  );
});
