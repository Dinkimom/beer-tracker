'use client';

import type { TaskCardTagsProps } from './TaskCardTags.types';

import { useI18n } from '@/contexts/LanguageContext';
import { formatTaskTestPointsForDisplay } from '@/lib/pointsUtils';

import { TaskCardTagsGitlabSection } from './TaskCardTagsGitlabSection';
import {
  isReleaseSidebarTaskCardTags,
  isSwimlaneTaskCardTagsVariant,
  resolveContainerClass,
  resolveGitlabChecksDisplay,
  resolveTaskCardTagsLayout,
  resolveTaskCardTagsPoints,
} from './taskCardTagsHelpers';
import { TaskCardTagsSidebarRow } from './TaskCardTagsSidebarRow';

export function TaskCardTags({
  task,
  taskPosition: _,
  variant = 'swimlane',
  displayDuration,
  releaseGitlabChecks,
  releaseGitlabChecksLoading = false,
  showDangerousReleaseInsteadOfStatus = false,
  inlineLayout = false,
  slaBugDemoteReason,
  slaBugSignalLabel,
}: TaskCardTagsProps) {
  const { t } = useI18n();

  if (isSwimlaneTaskCardTagsVariant(variant)) {
    return null;
  }

  const { containerPadding, tagTextSize } = resolveTaskCardTagsLayout(variant, displayDuration);
  const {
    dangerousReleaseColorClasses,
    dangerousReleaseValue,
    hideTestPoints,
    spText,
  } = resolveTaskCardTagsPoints(task);
  const tpText = formatTaskTestPointsForDisplay(task, 'compact');
  const gitlabChecks = releaseGitlabChecks
    ? resolveGitlabChecksDisplay({ releaseGitlabChecks, t })
    : null;
  const isReleaseSidebarCard = isReleaseSidebarTaskCardTags(
    variant,
    showDangerousReleaseInsteadOfStatus
  );
  const containerClass = resolveContainerClass({
    containerPadding,
    inlineLayout,
    isReleaseSidebarCard,
  });

  return (
    <div className={containerClass}>
      <TaskCardTagsGitlabSection
        gitlabChecks={gitlabChecks}
        loading={releaseGitlabChecksLoading}
        releaseGitlabChecks={releaseGitlabChecks}
      />
      <TaskCardTagsSidebarRow
        dangerousReleaseColorClasses={dangerousReleaseColorClasses}
        dangerousReleaseValue={dangerousReleaseValue}
        hideTestPoints={hideTestPoints}
        inlineLayout={inlineLayout}
        showDangerousReleaseInsteadOfStatus={showDangerousReleaseInsteadOfStatus}
        slaBugDemoteReason={slaBugDemoteReason}
        slaBugSignalLabel={slaBugSignalLabel}
        spText={spText}
        tagTextSize={tagTextSize}
        task={task}
        tpText={tpText}
      />
    </div>
  );
}
