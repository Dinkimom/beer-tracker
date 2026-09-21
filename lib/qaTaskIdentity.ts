import { v5 as uuidv5 } from 'uuid';

const QA_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export function buildSyntheticQaTaskId(devTaskId: string): string {
  return uuidv5(`qa-${devTaskId}`, QA_NAMESPACE);
}
