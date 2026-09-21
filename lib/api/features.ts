/**
 * Клиентский фасад /api/features/** и /api/document-types.
 */

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

interface FeatureDto {
  boardId: number;
  createdAt: string;
  description: string;
  id: string;
  name: string;
  responsibleByPlatform?: unknown;
  status: string;
  tasks?: unknown;
  updatedAt: string;
}

interface FeatureDocumentDto {
  content: string;
  createdAt: string;
  displayOrder: number;
  documentTypeId: string;
  editorType?: string;
  iconName?: string;
  id: string;
  name: string;
  type?: string;
  updatedAt: string;
}

interface FeatureDiagramDto {
  content: string;
  createdAt: string;
  displayOrder: number;
  id: string;
  name: string;
  updatedAt: string;
}

interface GroomingTodoDto {
  assignee?: string | null;
  completed: boolean;
  createdAt: string;
  deadline?: string | null;
  displayOrder: number;
  featureId: string;
  id: string;
  text: string;
  updatedAt: string;
}

interface DocumentTypeDto {
  code: string;
  contentFormat: string;
  createdAt: string;
  editorType: string;
  iconName: string;
  id: string;
  name: string;
}

export async function fetchFeatures(boardId: number): Promise<FeatureDto[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ features: FeatureDto[] }>(
    '/features',
    { params: { boardId } }
  );
  return data.features ?? [];
}

export async function fetchFeature(featureId: string): Promise<FeatureDto | null> {
  const { data } = await getPlannerBeerTrackerApi().get<{ feature: FeatureDto }>(
    `/features/${encodeURIComponent(featureId)}`
  );
  return data.feature ?? null;
}

export async function createFeature(input: {
  boardId: number;
  description?: string;
  name: string;
  responsibleByPlatform?: unknown;
  status?: string;
}): Promise<FeatureDto> {
  const { data } = await getPlannerBeerTrackerApi().post<{ feature: FeatureDto }>(
    '/features',
    input
  );
  return data.feature;
}

export async function updateFeature(
  featureId: string,
  patch: Partial<{
    description: string;
    name: string;
    responsibleByPlatform: unknown;
    status: string;
    tasks: unknown;
  }>
): Promise<FeatureDto> {
  const { data } = await getPlannerBeerTrackerApi().put<{ feature: FeatureDto }>(
    `/features/${encodeURIComponent(featureId)}`,
    patch
  );
  return data.feature;
}

export async function deleteFeature(featureId: string): Promise<void> {
  await getPlannerBeerTrackerApi().delete(`/features/${encodeURIComponent(featureId)}`);
}

export async function fetchFeatureDocuments(featureId: string): Promise<FeatureDocumentDto[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ documents: FeatureDocumentDto[] }>(
    `/features/${encodeURIComponent(featureId)}/documents`
  );
  return data.documents ?? [];
}

export async function fetchFeatureDiagrams(featureId: string): Promise<FeatureDiagramDto[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ diagrams: FeatureDiagramDto[] }>(
    `/features/${encodeURIComponent(featureId)}/diagrams`
  );
  return data.diagrams ?? [];
}

export async function fetchGroomingTodos(featureId: string): Promise<GroomingTodoDto[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ todos: GroomingTodoDto[] }>(
    `/features/${encodeURIComponent(featureId)}/grooming/todos`
  );
  return data.todos ?? [];
}

export async function fetchDocumentTypes(): Promise<DocumentTypeDto[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ documentTypes: DocumentTypeDto[] }>(
    '/document-types'
  );
  return data.documentTypes ?? [];
}
