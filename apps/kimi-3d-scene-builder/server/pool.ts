const MAX_UPSTREAM = 2;

let active = 0;
const waiting: Array<() => void> = [];

export function withUpstreamSlot<T>(run: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = () => {
      active += 1;
      run().then(resolve, reject).finally(() => {
        active -= 1;
        const next = waiting.shift();
        if (next) next();
      });
    };
    if (active < MAX_UPSTREAM) start();
    else waiting.push(start);
  });
}
