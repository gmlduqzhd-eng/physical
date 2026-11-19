/** 화면 파일(묶음)을 못 받아서 난 오류인지. 새 버전 배포 직후나 인터넷이 끊겼을 때 생기고, 새로고침하면 대개 풀린다. */
export const isChunkLoadError = (error: unknown): boolean =>
  /dynamically imported module|Importing a module script failed|Unable to preload|ChunkLoadError|Loading chunk|Failed to fetch/i.test(error instanceof Error ? `${error.name} ${error.message}` : String(error ?? ''));
