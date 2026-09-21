import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const postMock = vi.fn();
const putMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('../plannerBeerTrackerApiOverride', () => ({
  getPlannerBeerTrackerApi: () => ({
    get: getMock,
    post: postMock,
    put: putMock,
    delete: deleteMock,
  }),
}));

import {
  createFeature,
  deleteFeature,
  fetchDocumentTypes,
  fetchFeature,
  fetchFeatureDiagrams,
  fetchFeatureDocuments,
  fetchFeatures,
  fetchGroomingTodos,
  updateFeature,
} from './features';

describe('lib/api/features', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    putMock.mockReset();
    deleteMock.mockReset();
  });

  it('fetchFeatures GETs /features with boardId', async () => {
    getMock.mockResolvedValue({ data: { features: [{ id: '1', name: 'A' }] } });
    const features = await fetchFeatures(42);
    expect(getMock).toHaveBeenCalledWith('/features', { params: { boardId: 42 } });
    expect(features).toEqual([{ id: '1', name: 'A' }]);
  });

  it('CRUD and nested GETs hit expected paths', async () => {
    getMock.mockResolvedValue({ data: { feature: { id: 'f1' }, documents: [], diagrams: [], todos: [] } });
    postMock.mockResolvedValue({ data: { feature: { id: 'f2' } } });
    putMock.mockResolvedValue({ data: { feature: { id: 'f1', name: 'n' } } });
    deleteMock.mockResolvedValue({});

    await expect(fetchFeature('f1')).resolves.toEqual({ id: 'f1' });
    await expect(createFeature({ boardId: 1, name: 'x' })).resolves.toEqual({ id: 'f2' });
    await expect(updateFeature('f1', { name: 'n' })).resolves.toEqual({ id: 'f1', name: 'n' });
    await deleteFeature('f1');
    await fetchFeatureDocuments('f1');
    await fetchFeatureDiagrams('f1');
    await fetchGroomingTodos('f1');

    expect(getMock).toHaveBeenCalledWith('/features/f1');
    expect(postMock).toHaveBeenCalledWith('/features', { boardId: 1, name: 'x' });
    expect(putMock).toHaveBeenCalledWith('/features/f1', { name: 'n' });
    expect(deleteMock).toHaveBeenCalledWith('/features/f1');
    expect(getMock).toHaveBeenCalledWith('/features/f1/documents');
    expect(getMock).toHaveBeenCalledWith('/features/f1/diagrams');
    expect(getMock).toHaveBeenCalledWith('/features/f1/grooming/todos');
  });

  it('fetchDocumentTypes GETs /document-types', async () => {
    getMock.mockResolvedValue({ data: { documentTypes: [{ id: 'dt1', code: 'md' }] } });
    const types = await fetchDocumentTypes();
    expect(getMock).toHaveBeenCalledWith('/document-types');
    expect(types).toEqual([{ id: 'dt1', code: 'md' }]);
  });
});
