import { useEffect, useState } from 'react';

export function useStaleWaitingHint(waitingJobId: string | null | undefined): boolean {
  const [staleWaitingHint, setStaleWaitingHint] = useState(false);

  useEffect(() => {
    if (waitingJobId == null) {
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setStaleWaitingHint(true);
      }
    }, 15_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setStaleWaitingHint(false);
    };
  }, [waitingJobId]);

  return staleWaitingHint;
}
