const CHUNK_CHARS = 28;
const CHUNK_INTERVAL_MS = 30;

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      resolve();
    }, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function streamMock(
  text: string,
  onChunk: (full: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (text.length === 0) {
    onChunk("");
    return;
  }

  let index = 0;
  while (index < text.length) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    index = Math.min(text.length, index + CHUNK_CHARS);
    onChunk(text.slice(0, index));
    if (index < text.length) {
      await delay(CHUNK_INTERVAL_MS, signal);
    }
  }
}
