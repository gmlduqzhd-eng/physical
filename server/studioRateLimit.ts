import { createHmac, randomUUID } from 'node:crypto';
import { z } from 'zod';

const resultSchema = z.object({ allowed: z.boolean(), retrySeconds: z.number().int().min(0).max(86400), reason: z.enum(['released','login','busy','minute','daily','accepted']) });
export type LimitResult = z.infer<typeof resultSchema>;
export class StudioLimiterUnavailable extends Error { constructor() { super('공통 요청 제한 서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요.'); } }

export async function studioLimit(kind: 'login' | 'generate' | 'release', actor: string, token: string = randomUUID()): Promise<LimitResult & { token: string }> {
  const url = process.env.STUDIO_LIMIT_URL;
  const key = process.env.STUDIO_LIMIT_KEY;
  const secret = process.env.STUDIO_LIMIT_SECRET;
  if (!url || !key || !secret || secret.length < 32) throw new StudioLimiterUnavailable();
  try {
    const endpoint = new URL('/rest/v1/rpc/studio_limit_request', url);
    if (endpoint.protocol !== 'https:') throw new Error('HTTPS required');
    const response = await fetch(endpoint, {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ server_secret: secret, request_kind: kind, actor_hash: createHmac('sha256', secret).update(kind === 'login' ? 'login:' + actor : 'generation').digest('hex'), lease_token: token }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Limiter rejected');
    return { ...resultSchema.parse(await response.json()), token };
  } catch { throw new StudioLimiterUnavailable(); }
}
