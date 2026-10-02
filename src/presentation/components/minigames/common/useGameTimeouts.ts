import { useCallback, useEffect, useRef } from 'react';

/** Keep delayed round transitions and score submissions inside their game session. */
export const useGameTimeouts = () => {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const scheduleTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
    return timer;
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  return scheduleTimeout;
};
