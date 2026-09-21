'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { useI18n } from '@/contexts/LanguageContext';

import { LoadingOverlayView } from './LoadingOverlayView';
import { notifyPlannerLoadingOverlayHidden } from './plannerLoadingOverlayEvents';

interface LoadingOverlayProps {
  isVisible: boolean;
  /** When omitted, uses localized default from `common.loading`. */
  message?: string;
}

const emptySubscribe = () => () => {};

export function LoadingOverlay({ isVisible, message: messageProp }: LoadingOverlayProps) {
  const { t } = useI18n();
  const message = messageProp ?? t('common.loading');
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => typeof document !== 'undefined',
    () => false
  );
  const wasVisibleRef = useRef(isVisible);

  useEffect(() => {
    if (wasVisibleRef.current && !isVisible) {
      notifyPlannerLoadingOverlayHidden();
    }
    wasVisibleRef.current = isVisible;
  }, [isVisible]);

  if (!isVisible) return null;
  if (!mounted) return null;

  return createPortal(<LoadingOverlayView message={message} />, document.body);
}
