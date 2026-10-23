export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Math.min(Math.max(limit, 0), items.length);
  if (runners === 0) return results;
  await Promise.all(
    Array.from({ length: runners }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        const item = items[index];
        if (item === undefined) return;
        results[index] = await worker(item);
      }
    }),
  );
  return results;
}

export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
