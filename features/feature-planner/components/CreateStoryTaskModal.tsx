'use client';


import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { OVERLAY_BACKDROP_ENTER, OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { TextArea } from '@/components/TextArea';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

interface CreateStoryTaskModalProps {
  isLoading?: boolean;
  isOpen: boolean;
  parent: { id: string; display: string; key?: string } | null;
  onClose: () => void;
  onSubmit: (data: { title: string; description?: string | null; storyPoints?: number | null; testPoints?: number | null }) => Promise<void> | void;
}

export function CreateStoryTaskModal({
  isOpen,
  parent,
  isLoading,
  onClose,
  onSubmit,
}: CreateStoryTaskModalProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storyPoints, setStoryPoints] = useState<string>('');
  const [testPoints, setTestPoints] = useState<string>('');

  const [latchedParent, setLatchedParent] = useState(parent);
  if (parent && parent !== latchedParent) {
    setLatchedParent(parent);
  }
  const displayParent = parent ?? latchedParent;
  const overlay = useOverlayPresence(isOpen && Boolean(displayParent));

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      setTitle('');
      setDescription('');
      setStoryPoints('');
      setTestPoints('');
    });
  }, [isOpen, parent?.key]);

  if (!overlay.mounted || !displayParent) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const sp = storyPoints.trim() === '' ? null : Number(storyPoints);
    const tp = testPoints.trim() === '' ? null : Number(testPoints);

    await onSubmit({
      title: trimmed,
      description: description.trim() || undefined,
      storyPoints: Number.isNaN(sp) ? null : sp,
      testPoints: Number.isNaN(tp) ? null : tp,
    });
  };

  const content = (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/70 ${OVERLAY_BACKDROP_ENTER}`}
      data-state={overlay.state}
      style={{ zIndex: ZIndex.modalBackdrop }}
      onAnimationEnd={overlay.onAnimationEnd}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('planning.featurePlanner.createStoryTask.title', {
              storyRef: displayParent.key ?? displayParent.display,
            })}
          </h2>
        </div>
        <form className="p-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('planning.featurePlanner.createStoryTask.nameLabel')}
            </label>
            <Input
              autoFocus
              disabled={isLoading}
              placeholder={t('planning.featurePlanner.createStoryTask.namePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('planning.featurePlanner.createStoryTask.descriptionLabel')}
            </label>
            <TextArea
              disabled={isLoading}
              placeholder={t('planning.featurePlanner.createStoryTask.descriptionPlaceholder')}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Story Points
              </label>
              <Input
                disabled={isLoading}
                inputMode="numeric"
                placeholder={t('planning.featurePlanner.createStoryTask.storyPointsExample')}
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Test Points
              </label>
              <Input
                disabled={isLoading}
                inputMode="numeric"
                placeholder={t('planning.featurePlanner.createStoryTask.testPointsExample')}
                value={testPoints}
                onChange={(e) => setTestPoints(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              {t('common.cancel')}
            </Button>
            <Button
              disabled={isLoading || !title.trim()}
              type="submit"
            >
              {t('planning.featurePlanner.createStoryTask.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

