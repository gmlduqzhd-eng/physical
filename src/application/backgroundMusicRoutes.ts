const musicPages = new Set([
  '/', '/start', '/hub', '/games', '/hub/tools', '/about', '/manual',
  '/teacher', '/teacher/setup', '/lobby', '/solo', '/records',
]);

// Game routes manage their own sound. Keep browsing/classroom controls audible
// without playing the background track over a game's signals or instructions.
export function allowsBackgroundMusic(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return musicPages.has(path) || /^\/teacher\/room\/[^/]+$/.test(path);
}
