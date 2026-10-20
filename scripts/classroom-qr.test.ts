import test from 'node:test';
import assert from 'node:assert/strict';
import { classroomQrPath } from '../src/domain/classroomQr';
test('student scanner accepts only complete same-origin classroom invitations', () => {
  const origin='https://physical-pi.vercel.app';
  const path='/join?room=12345678-1234-1234-1234-123456789abc&group=1%EB%AA%A8%EB%91%A0#code=abcdef123456';
  assert.equal(classroomQrPath(origin+path,origin),path);
  assert.ok(classroomQrPath(origin+path.replace('1%EB%AA%A8%EB%91%A0',encodeURIComponent('새싹모둠')),origin));
  for (const input of ['https://untrusted.example'+path,'javascript:alert(1)',origin+'/admin',origin+path.split('#')[0],origin+path.replace('abcdef123456','short'),origin+path.replace('12345678-1234-1234-1234-123456789abc','-'.repeat(36)),origin+path.replace('1%EB%AA%A8%EB%91%A0','')]) assert.equal(classroomQrPath(input,origin),null);
});
