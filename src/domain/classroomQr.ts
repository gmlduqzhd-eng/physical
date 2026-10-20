// Only classroom join URLs from this app may be opened by the student scanner.
export function classroomQrPath(value: string, origin: string): string | null {
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.pathname !== '/join') return null;
    const room = url.searchParams.get('room'); const group = url.searchParams.get('group');
    const code = new URLSearchParams(url.hash.slice(1)).get('code');
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(room ?? '') || !group?.trim() || group.length > 40 || [...group].some(char => char.charCodeAt(0) < 32) || !/^[a-f0-9]{12}$/i.test(code ?? '')) return null;
    return '/join?' + new URLSearchParams({ room: room!, group: group! }).toString() + '#' + new URLSearchParams({ code: code! }).toString();
  } catch { return null; }
}
