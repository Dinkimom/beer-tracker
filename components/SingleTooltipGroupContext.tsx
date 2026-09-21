'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface SingleTooltipGroupContextValue {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

const SingleTooltipGroupContext = createContext<SingleTooltipGroupContextValue | null>(null);

/**
 * Провайдер группы тултипов: одновременно открыт только один тултип с заданным singleInGroupId.
 * Оборачивать весь таймлайн (все строки), чтобы был один активный тултип статуса на весь таймлайн.
 */
export function SingleTooltipGroupProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const value: SingleTooltipGroupContextValue = {
    openId,
    setOpenId: useCallback((id: string | null) => setOpenId(id), []),
  };
  return (
    <SingleTooltipGroupContext.Provider value={value}>
      {children}
    </SingleTooltipGroupContext.Provider>
  );
}

export function useSingleTooltipGroup() {
  return useContext(SingleTooltipGroupContext);
}
