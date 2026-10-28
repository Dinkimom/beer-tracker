/** Map по батчам: внутри батча параллельно, батчи последовательно (ограничение конкурентности). */
export async function mapInChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const part = await Promise.all(chunk.map(fn));
    out.push(...part);
  }
  return out;
}
