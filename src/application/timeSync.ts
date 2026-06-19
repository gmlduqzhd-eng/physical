export let timeOffset = 0;

export const syncServerTime = async (supabaseUrl: string) => {
  if (!supabaseUrl) return;
  try {
    const start = Date.now();
    const res = await fetch(`${supabaseUrl}/rest/v1/`, { method: 'HEAD' });
    const serverDateStr = res.headers.get('Date');
    if (serverDateStr) {
      const serverTime = new Date(serverDateStr).getTime();
      const latency = (Date.now() - start) / 2; // Approximate one-way latency
      timeOffset = (serverTime + latency) - Date.now();
    }
  } catch (error) {
    console.error('Failed to sync server time:', error);
  }
};
