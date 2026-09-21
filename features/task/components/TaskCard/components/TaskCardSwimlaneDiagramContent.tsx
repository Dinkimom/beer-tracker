'use client';

import { TaskCardSwimlaneDiagramCaption } from './TaskCardSwimlaneDiagramCaption';
import { useTaskCardSwimlaneDiagramDraft } from './TaskCardSwimlaneDiagramDraftContext';
import { TaskCardSwimlaneDiagramDraftEditor } from './TaskCardSwimlaneDiagramDraftEditor';
import { TaskCardSwimlaneDiagramPreview } from './TaskCardSwimlaneDiagramPreview';

interface TaskCardSwimlaneDiagramContentProps {
  isDragging?: boolean;
  isResizing?: boolean;
  name?: string;
  namePlaceholder: string;
  sceneText?: string;
  sceneUrl?: string;
  untitledName: string;
}

export function TaskCardSwimlaneDiagramContent({
  isDragging = false,
  isResizing = false,
  name,
  namePlaceholder,
  sceneUrl,
  sceneText,
  untitledName,
}: TaskCardSwimlaneDiagramContentProps) {
  const diagramDraft = useTaskCardSwimlaneDiagramDraft();
  if (diagramDraft) {
    return <TaskCardSwimlaneDiagramDraftEditor draft={diagramDraft} />;
  }
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <TaskCardSwimlaneDiagramPreview
        alt={name?.trim() || untitledName}
        isDragging={isDragging}
        isResizing={isResizing}
        sceneText={sceneText}
        sceneUrl={sceneUrl}
      />
      <TaskCardSwimlaneDiagramCaption
        name={name}
        placeholder={namePlaceholder}
        untitledName={untitledName}
      />
    </div>
  );
}
