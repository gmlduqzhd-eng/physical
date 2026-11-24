import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { statsRequest } from '../src/application/activityStats';

const sql = readFileSync('supabase/migrations/20261124030000_teacher_class_records_and_activity_counts.sql', 'utf8');
test('anonymous count sends only the activity id, to our own Supabase project', () => {
  const req = statsRequest('sig-boss-raid', 'https://abc123.supabase.co', 'anon-key');
  assert.ok(req);
  assert.equal(req.url, 'https://abc123.supabase.co/rest/v1/rpc/count_activity_play');
  assert.equal(req.init.body, JSON.stringify({ activity: 'sig-boss-raid' }));
  assert.equal(req.init.credentials, 'omit');
  assert.equal(statsRequest('../x', 'https://abc123.supabase.co', 'k'), null, 'odd ids are not sent');
  assert.equal(statsRequest('ok', undefined, 'k'), null);
  assert.equal(statsRequest('ok', 'https://evil.example.com', 'k'), null, 'other hosts are refused');
});
test('counting is tied to recording a play and can be turned off', () => {
  assert.match(readFileSync('src/application/classProgressStore.ts', 'utf8'), /write\(addPlay\([^;]*\);countActivityPlay\(id\);/);
  const stats = readFileSync('src/application/activityStats.ts', 'utf8');
  assert.match(stats, /if\(!statsEnabled\(\)\)return;/);
  const privacy = readFileSync('src/presentation/PrivacyPage.tsx', 'utf8');
  assert.match(privacy, /data-stats-toggle/);
  assert.match(privacy, /보내는 것은 활동 번호 하나뿐/);
});
test('account records: only the signed-in teacher, only when asked, hidden when the server lacks it', () => {
  const cloud = readFileSync('src/application/classCloudStore.ts', 'utf8');
  assert.match(cloud, /session&&!session\.user\.is_anonymous\?supabase:null/);
  assert.match(cloud, /rpc\('teacher_class_records',args\)/);
  const ui = readFileSync('src/presentation/components/ClassSwitcher.tsx', 'utf8');
  assert.match(ui, /cloud\?\.status==='ready'&&<div className="class-switcher-row class-switcher-backup" data-class-cloud>/);
});
test('migration keeps tables private and limits who can call what', () => {
  for (const table of ['teacher_class_records', 'activity_play_counts']) {
    assert.match(sql, new RegExp(`ALTER TABLE physical_internal\\.${table} ENABLE ROW LEVEL SECURITY`));
    assert.match(sql, new RegExp(`REVOKE ALL ON physical_internal\\.${table} FROM PUBLIC,anon,authenticated`));
  }
  assert.match(sql, /a\.enabled AND u\.is_anonymous IS NOT DISTINCT FROM false/);
  assert.match(sql, /public\.teacher_class_records\(jsonb,boolean\) TO authenticated;/);
  assert.match(sql, /public\.count_activity_play\(text\) TO anon,authenticated;/);
  assert.match(sql, /IF NOT physical_internal\.is_teacher_admin\(\) THEN RAISE EXCEPTION 'Administrator required'/);
  assert.equal((sql.match(/SECURITY DEFINER SET search_path=''/g) || []).length, 3);
  assert.doesNotMatch(sql, /DROP |TRUNCATE |ALTER TABLE public\./, 'only adds new objects');
});
