import test from 'node:test';
import assert from 'node:assert/strict';
import { adoptLocalChallenge, reviewLocalChallenge } from '../teacher-studio/localChallenge';
import { requestStudio, StudioRequestError, studioSessionExpired } from '../teacher-studio/studioRequest';

test('invalid or incomplete local records never become an adoptable result', () => {
  for (const bad of [{ score: '', rpe: '' }, { score: ' ', rpe: '2' }, { score: '5', rpe: '0' }, { score: '5', rpe: '5.1' }, { score: '-1', rpe: '2' }, { score: 'Infinity', rpe: '2' }]) {
    const review = reviewLocalChallenge([bad, { score: '2', rpe: '2' }, { score: '1', rpe: '2' }], 'space-occupier');
    assert.equal(review.kind, 'invalid');
    assert.equal(adoptLocalChallenge(review), review);
    assert.equal('text' in review, false);
  }
  assert.equal(reviewLocalChallenge([], 'space-occupier').kind, 'invalid');
});

test('valid local advice is reviewable while a blank edited result cannot be adopted', () => {
  const review = reviewLocalChallenge([{ score: '3', rpe: '2' }, { score: '2', rpe: '2' }, { score: '1', rpe: '2' }], 'space-occupier');
  assert.equal(review.kind, 'ready');
  assert.equal('adopted' in review && review.adopted, false);
  const adopted = adoptLocalChallenge(review);
  assert.equal('adopted' in adopted && adopted.adopted, true);
  assert.match('text' in adopted ? adopted.text : '', /자동 승급하지 않습니다/);
  const blank = { kind: 'ready', text: ' ', adopted: false } as const;
  assert.equal(adoptLocalChallenge(blank), blank);
});

test('expired studio sessions have a distinct HTTP status and never auto retry', async () => {
  let calls = 0;
  const form = { grade: '5~6학년군', minutes: 20, groupSize: 4, classSize: 24 };
  const before = { ...form };
  const fetcher: typeof fetch = async (_url, options) => {
    calls++;
    assert.deepEqual(JSON.parse(String(options?.body)), before);
    return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 });
  };
  await assert.rejects(requestStudio('generate', form, fetcher), error => studioSessionExpired(error));
  assert.equal(calls, 1);
  assert.deepEqual(form, before);
  assert.equal(studioSessionExpired(new StudioRequestError(429, '요청 한도')), false);
  assert.equal(studioSessionExpired(new TypeError('network')), false);
});

test('successful studio responses remain available without changing their structure', async () => {
  const payload = { authenticated: true, configured: true, aiReady: true };
  const fetcher: typeof fetch = async () => new Response(JSON.stringify(payload));
  assert.deepEqual(await requestStudio('status', undefined, fetcher), payload);
});
