import { useCallback, useRef } from 'react';

/** Completion can race a tap, a timer, or React's repeated updater checks. */
export const useGameScoreSubmission = <T,>(enqueueAction: (action: T) => void) => {
  const submitted = useRef(false);
  const submit = useCallback((action: T) => {
    if (submitted.current) return;
    submitted.current = true;
    enqueueAction(action);
  }, [enqueueAction]);
  const reset = useCallback(() => { submitted.current = false; }, []);
  return [submit, reset] as const;
};
