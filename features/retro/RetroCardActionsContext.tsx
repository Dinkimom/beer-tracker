'use client';

import type { RetroIdentity } from './retroIdentity';
import type { RetroVisibleCard } from '@/lib/retro/retroBoard';

import { createContext, useContext } from 'react';

type CardRef = Pick<RetroVisibleCard, 'id' | 'ownerSprintId'>;

/**
 * Что можно сделать с карточкой ретро и от чьего имени. Задаёт доска; колонка и обёртка
 * карточки это не передают. Без провайдера (превью перетаскивания) карточка только для чтения.
 */
export interface RetroCardActions {
  me: RetroIdentity;
  addComment: (card: CardRef, text: string) => void;
  deleteCard: (card: CardRef) => void;
  deleteComment: (card: CardRef, commentId: string) => void;
  toggleReaction: (card: CardRef, emoji: string) => void;
  updateText: (card: CardRef, text: string) => void;
}

export const RetroCardActionsContext = createContext<RetroCardActions | null>(null);

export function useRetroCardActions(): RetroCardActions | null {
  return useContext(RetroCardActionsContext);
}
