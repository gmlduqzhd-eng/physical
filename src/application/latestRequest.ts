/** Superseded reads may finish, but can never replace the newest screen. */
export function latestRequest() {
  let current = 0;
  return {
    begin() { const id = ++current; return () => id === current; },
    cancel() { current++; },
  };
}
