import test from 'node:test';
import assert from 'node:assert/strict';
import { studioLimit, StudioLimiterUnavailable } from '../server/studioRateLimit.js';

test('limiter sends only pseudonymous actor and server credential; preserves shared rejection and token', async () => {
  const before = { ...process.env }, original = globalThis.fetch;
  process.env.STUDIO_LIMIT_URL='https://limiter.example'; process.env.STUDIO_LIMIT_KEY='synthetic-publishable'; process.env.STUDIO_LIMIT_SECRET='synthetic-secret-for-test-only-12345678';
  let count=0; const records: Record<string,unknown>[]=[];
  globalThis.fetch=async(input,init)=>{
    assert.equal(String(input),'https://limiter.example/rest/v1/rpc/studio_limit_request');
    records.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({allowed:++count<=3,retrySeconds:count<=3?0:37,reason:count<=3?'accepted':'minute'}));
  };
  try {
    for(let i=0;i<3;i++)assert.equal((await studioLimit('generate','synthetic-session')).allowed,true);
    assert.deepEqual(await studioLimit('generate','different-server-instance','00000000-0000-4000-8000-000000000001'),{allowed:false,retrySeconds:37,reason:'minute',token:'00000000-0000-4000-8000-000000000001'});
    await studioLimit('login','192.0.2.42');
    assert.match(String(records[4].actor_hash),/^[a-f0-9]{64}$/);
    assert(!JSON.stringify(records).includes('192.0.2.42'));
    assert(!JSON.stringify(records).includes('synthetic-session'));
    assert.deepEqual(Object.keys(records[0]).sort(),['actor_hash','lease_token','request_kind','server_secret']);
  } finally {globalThis.fetch=original;process.env=before;}
});

test('missing configuration, malformed replies and network failure fail closed without reflecting secrets',async()=>{
  const before={...process.env}, original=globalThis.fetch;
  try {
    delete process.env.STUDIO_LIMIT_SECRET;
    await assert.rejects(()=>studioLimit('generate','session'),StudioLimiterUnavailable);
    process.env.STUDIO_LIMIT_URL='https://limiter.example';process.env.STUDIO_LIMIT_KEY='test';process.env.STUDIO_LIMIT_SECRET='s'.repeat(40);
    globalThis.fetch=async()=>new Response(JSON.stringify({allowed:true,retrySeconds:-1,reason:'invented'}));
    await assert.rejects(()=>studioLimit('generate','session'),StudioLimiterUnavailable);
    globalThis.fetch=async()=>{throw new Error('SECRET PROVIDER ERROR');};
    await assert.rejects(()=>studioLimit('generate','session'),e=>e instanceof StudioLimiterUnavailable&&!e.message.includes('SECRET'));
  }finally{globalThis.fetch=original;process.env=before;}
});
