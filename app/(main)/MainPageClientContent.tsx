'use client';

import type { MainPageClientSprintsContentProps } from './MainPageClientSprintsContent';

import { MainPageClientSprintsContent } from './MainPageClientSprintsContent';

interface MainPageClientContentProps extends MainPageClientSprintsContentProps {
  isMounted: boolean;
}

/** После гидрации планер живёт под оверлеем: чанк свимлейна грузится параллельно с API. */
export function MainPageClientContent({ isMounted, ...content }: MainPageClientContentProps) {
  if (!isMounted) {
    return null;
  }

  return <MainPageClientSprintsContent {...content} />;
}
