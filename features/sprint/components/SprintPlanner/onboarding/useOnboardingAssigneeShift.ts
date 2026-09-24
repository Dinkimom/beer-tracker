'use client';

import { useEffect } from 'react';

import { useOnboardingResizePulse } from './useOnboardingResizePulse';

const PIVCHIK_SELECTOR = '[data-onboarding-assignee="pivchik"]';
const SLIVCHIK_SELECTOR = '[data-onboarding-assignee="slivchik"]';
const SHIFT_VAR = '--onboarding-row-shift';

/** Карточка Пивчика плавно съезжает на строку Сливчика и возвращается. */
export function useOnboardingAssigneeShift(active: boolean): boolean {
  const shifted = useOnboardingResizePulse(active);

  useEffect(() => {
    if (!active || typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    const measure = () => {
      const from = document.querySelector(PIVCHIK_SELECTOR);
      const to = document.querySelector(SLIVCHIK_SELECTOR);
      if (!(from instanceof HTMLElement) || !(to instanceof HTMLElement)) {
        return;
      }
      const dy = to.getBoundingClientRect().top - from.getBoundingClientRect().top;
      root.style.setProperty(SHIFT_VAR, `${dy}px`);
    };
    const observer = new ResizeObserver(measure);
    const attach = () => {
      observer.disconnect();
      const from = document.querySelector(PIVCHIK_SELECTOR);
      const to = document.querySelector(SLIVCHIK_SELECTOR);
      if (from instanceof HTMLElement) {
        observer.observe(from);
      }
      if (to instanceof HTMLElement) {
        observer.observe(to);
      }
      measure();
    };
    attach();
    const mutations = new MutationObserver(attach);
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', measure);
    return () => {
      mutations.disconnect();
      observer.disconnect();
      window.removeEventListener('resize', measure);
      root.style.removeProperty(SHIFT_VAR);
    };
  }, [active]);

  return shifted;
}
