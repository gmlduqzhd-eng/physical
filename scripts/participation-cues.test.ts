import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PARTICIPATION_HASH_LENGTH, participationLink, readParticipationCues } from '../src/domain/participationCues';
import { sources, validateOutput } from '../server/aiService';
import type { TeacherInput, TeacherOutput } from '../src/domain/teacherAi';

const cues = { activityId: 'space-occupier', mission: '짝과 빈 공간으로 이동해 보세요.', roles: '수행자와 관찰자가 차례를 바꾸세요.', waiting: '기다릴 때는 제자리에서 이동 방향을 가리키세요.' };

test('only a matching, bounded teacher reviewed card opens in the student activity', () => {
  const link = participationLink('https://physical-pi.vercel.app', cues);
  const hash = new URL(link).hash;
  assert.deepEqual(readParticipationCues(hash, cues.activityId), cues);
  assert.equal(readParticipationCues(hash, 'fitness'), null);
  assert.equal(readParticipationCues('#participation=%7Bbad', cues.activityId), null);
  assert.equal(readParticipationCues('#participation=' + 'x'.repeat(MAX_PARTICIPATION_HASH_LENGTH), cues.activityId), null);
  assert.equal(readParticipationCues(hash + '&participation=%7B%7D', cues.activityId), null);
  assert.equal(readParticipationCues(hash + '&extra=1', cues.activityId), null);
  assert.throws(() => participationLink('https://physical-pi.vercel.app', { ...cues, mission: 'a'.repeat(101) }));
  assert.throws(() => participationLink('https://physical-pi.vercel.app', { ...cues, mission: '첫째\n둘째' }));
});

test('maximum length Korean and Unicode cue links survive encoding and reading', () => {
  for (const text of ['가'.repeat(100), '🏃'.repeat(50), '"\\%&<'.repeat(20)]) {
    const input = { activityId: '나'.repeat(100), mission: text, roles: text, waiting: text };
    const hash = new URL(participationLink('https://physical-pi.vercel.app', input)).hash;
    assert.ok(hash.length <= MAX_PARTICIPATION_HASH_LENGTH);
    assert.deepEqual(readParticipationCues(hash, input.activityId), input);
  }
  const formerFailure = { ...cues, mission: '가'.repeat(50), roles: '나'.repeat(50), waiting: '다'.repeat(50) };
  const hash = new URL(participationLink('https://physical-pi.vercel.app', formerFailure)).hash;
  assert.ok(hash.length > 1400);
  assert.deepEqual(readParticipationCues(hash, formerFailure.activityId), formerFailure);
});

test('student participation AI output needs the exact three short grounded sections', () => {
  const input: TeacherInput = { task: 'participation', activityId: cues.activityId, grade: '3~4학년군', goal: '협동과 소통', place: '체육관', device: '태블릿 PC', deviceCount: '모둠별 1대', minutes: 40, groupSize: 6, activityMinutes: 10, classSize: 24, weather: '제약 없음', observations: [], aggregate: null, consent: true };
  const source = sources(input)[0];
  const output: TeacherOutput = { title: '교사 검토용 참여 안내', recommendations: [], sections: [cues.mission, cues.roles, cues.waiting].map((content, index) => ({ heading: ['오늘의 몸 미션', '역할 바꾸기', '기다리는 동안'][index], minutes: null, content, citations: [{ activityId: source.id, field: 'description', quote: source.description }] })), safety: source.safety.slice(0, 1).map(quote => ({ activityId: source.id, quote })), teacherChecks: ['모두 참여할 수 있는 동작인가요?'] };
  assert.doesNotThrow(() => validateOutput(output, input));
  assert.throws(() => validateOutput({ ...output, sections: output.sections.slice(0, 2) }, input));
  assert.throws(() => validateOutput({ ...output, sections: output.sections.map((section, index) => index === 0 ? { ...section, content: '가'.repeat(101) } : section) }, input));
});
