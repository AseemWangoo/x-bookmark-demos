export type Clock = {
  now: () => number;
};

export function systemClock(): Clock {
  return { now: () => Date.now() };
}

export type ManualClock = Clock & {
  advance: (ms: number) => void;
};

export function createManualClock(start = 0): ManualClock {
  let time = start;
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
  };
}
