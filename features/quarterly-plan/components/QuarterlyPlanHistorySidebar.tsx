'use client';

import type { QuarterlyPlanVersionListItem } from '@/lib/quarterlyPlans/quarterlyPlanVersionHistory';

import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { ResizableSidebar } from '@/components/ResizableSidebar';
import { useI18n } from '@/contexts/LanguageContext';
import { useQuarterHistorySidebarWidthStorage } from '@/hooks/useLocalStorage';

interface QuarterlyPlanHistorySidebarProps {
  loading: boolean;
  /** Сайдбар открыт; закрывается с анимацией ширины, как сайдбар планера. */
  open: boolean;
  previewLoading: boolean;
  restoring: boolean;
  /** Версия на доске; null — текущий план. */
  selectedId: string | null;
  versions: readonly QuarterlyPlanVersionListItem[];
  onClose: () => void;
  onRestore: (versionId: string) => void;
  onSelect: (versionId: string | null) => void;
}

/** Ширина сайдбара по умолчанию и её пределы при растягивании. */
const SIDEBAR_DEFAULT_WIDTH = 320;
const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 480;

/**
 * Сайдбар истории версий (QH3), как история версий в таблицах: версии от новых к старым — кто, когда и что
 * поменял. Встаёт рядом с доской, как сайдбар планера, и не закрывает её; ширина тянется за край.
 * Выбранная версия показывается на доске, её можно восстановить.
 */
export function QuarterlyPlanHistorySidebar({
  loading,
  open,
  previewLoading,
  restoring,
  selectedId,
  versions,
  onClose,
  onRestore,
  onSelect,
}: QuarterlyPlanHistorySidebarProps) {
  const { language, t } = useI18n();
  const dateFormat = new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
  });

  const author = (version: QuarterlyPlanVersionListItem) =>
    version.source === 'baseline' ? t('quarterlyPlan.history.baseline') : (version.authorName ?? t('quarterlyPlan.history.unknownAuthor'));

  const [width, setWidth] = useQuarterHistorySidebarWidthStorage(SIDEBAR_DEFAULT_WIDTH);
  return (
    <ResizableSidebar
      chrome="island"
      contentClassName="flex flex-col"
      headerActions={
        <HeaderIconButton title={t('quarterlyPlan.history.close')} onClick={onClose}>
          <Icon className="h-4 w-4" name="x" />
        </HeaderIconButton>
      }
      hideClosedHandle
      isOpen={open}
      maxWidth={SIDEBAR_MAX_WIDTH}
      minWidth={SIDEBAR_MIN_WIDTH}
      resizeHandleSide="left"
      title={t('quarterlyPlan.history.title')}
      // Ширина не уже минимальной: сохранённая ширина могла остаться от стягивания до закрытия.
      width={Math.max(SIDEBAR_MIN_WIDTH, width)}
      onToggle={onClose}
      onWidthChange={setWidth}
    >
      {selectedId ? (
        <div className="border-b border-black/10 bg-blue-500/[0.06] px-3 py-2 text-xs text-gray-700 dark:border-white/10 dark:text-gray-200">
          {previewLoading ? t('quarterlyPlan.history.loadingVersion') : t('quarterlyPlan.history.previewHint')}
        </div>
      ) : null}
      <div className="scrollbar-thin-custom min-h-0 flex-1 overflow-y-auto p-1.5">
        {loading ? <p className="px-2 py-3 text-xs text-ds-text-muted">{t('quarterlyPlan.history.loading')}</p> : null}
        {!loading && versions.length === 0 ? (
          <p className="px-2 py-3 text-xs text-ds-text-muted">{t('quarterlyPlan.history.empty')}</p>
        ) : null}
        {versions.map((version, index) => {
          const current = index === 0;
          const selected = current ? selectedId === null : selectedId === version.id;
          return (
            <div
              key={version.id}
              className={`mb-1 rounded-lg transition-colors ${selected ? 'bg-blue-500/10 ring-1 ring-blue-500/40 dark:bg-blue-400/15' : ''}`}
            >
              <button
                aria-current={selected}
                className="flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-black/[0.04] active:bg-black/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-white/[0.06] dark:active:bg-white/10"
                type="button"
                onClick={() => onSelect(current ? null : version.id)}
              >
                <span className="flex w-full items-baseline gap-2">
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {dateFormat.format(new Date(version.updatedAt))}
                  </span>
                  {current ? (
                    <span className="shrink-0 text-[11px] text-blue-700 dark:text-blue-300">{t('quarterlyPlan.history.current')}</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                  {author(version)}
                  {version.source === 'agent' || version.source === 'restore' ? (
                    <span className="rounded border border-black/10 px-1 text-[10px] leading-4 text-ds-text-muted dark:border-white/15">
                      {t(`quarterlyPlan.history.source.${version.source}`)}
                    </span>
                  ) : null}
                </span>
                {version.summary.length > 0 ? (
                  <span className="text-[11px] leading-snug text-ds-text-muted">
                    {version.summary
                      .map((entry) =>
                        [
                          t(`quarterlyPlan.history.kind.${entry.kind}`),
                          entry.added ? `+${entry.added}` : '',
                          entry.changed ? `~${entry.changed}` : '',
                          entry.removed ? `−${entry.removed}` : '',
                        ]
                          .filter(Boolean)
                          .join(' ')
                      )
                      .join(' · ')}
                  </span>
                ) : null}
              </button>
              {selected && !current ? (
                <div className="px-2.5 pb-2">
                  <Button
                    className="h-7 min-h-0 w-full !py-0 text-xs"
                    disabled={restoring || previewLoading}
                    variant="primary"
                    onClick={() => onRestore(version.id)}
                  >
                    {t(restoring ? 'quarterlyPlan.history.restoring' : 'quarterlyPlan.history.restore')}
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </ResizableSidebar>
  );
}
