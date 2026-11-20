import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {forgetTeacherConfirmed,googleUsedOnDevice,rememberGoogleUsed,rememberTeacherConfirmed,safeReturnPath,saveLoginReturn,shouldChooseGoogleAccount,takeLoginReturn,teacherConfirmedOnDevice} from '../src/application/teacherLoginPrefs';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('login return path accepts only same-site paths',()=>{
 assert.equal(safeReturnPath('/teacher/setup?x=1'),'/teacher/setup?x=1');
 assert.equal(safeReturnPath('/admin'),'/admin');
 for(const bad of ['//evil.com','http://x','https://evil.com/a','javascript:alert(1)','/\\evil','/a\\b','/a\u0000b','/a\nb','/javascript:alert(1)','/teacher/google-callback','/google-callback?code=1','','teacher',null,42,'/'+'a'.repeat(400)])
  assert.equal(safeReturnPath(bad),null,String(bad));
});

test('account chooser only on first login or when asked',()=>{
 assert.equal(shouldChooseGoogleAccount(false,false),true);
 assert.equal(shouldChooseGoogleAccount(false,true),false);
 assert.equal(shouldChooseGoogleAccount(true,true),true);
});

test('login return is taken once and expires',()=>{
 saveLoginReturn('/remote?room=1');
 assert.equal(takeLoginReturn(),'/remote?room=1');
 assert.equal(takeLoginReturn(),null);
 saveLoginReturn('//evil.com');
 assert.equal(takeLoginReturn(),null);
 const now=Date.now;
 try{saveLoginReturn('/teacher/manage');Date.now=()=>now()+11*60*1000;assert.equal(takeLoginReturn(),null);}finally{Date.now=now;}
});

test('device prefs remember a yes/no only, never an email',()=>{
 forgetTeacherConfirmed();
 assert.equal(teacherConfirmedOnDevice(),false);
 rememberTeacherConfirmed();rememberGoogleUsed();
 assert.equal(teacherConfirmedOnDevice(),true);
 assert.equal(googleUsedOnDevice(),true);
 forgetTeacherConfirmed();
 assert.equal(teacherConfirmedOnDevice(),false);
 const src=read('src/application/teacherLoginPrefs.ts');
 assert.doesNotMatch(src,/user_metadata|\.email\b/);
 assert.match(src,/'physical_teacher_confirmed_v1'/);assert.match(src,/'physical_google_used_v1'/);
});

test('server still receives the teacher confirmation and the status chip stays off student pages',()=>{
 assert.match(read('src/application/teacherGoogle.ts'),/adultTeacher:\s*true/);
 const chip=read('src/presentation/components/TeacherStatusChip.tsx');
 assert.match(chip,/join\|lobby\|fun-remote/);
 assert.match(chip,/action=logout/);
 assert.match(chip,/scope: 'local'/);
 assert.match(read('src/presentation/components/HeaderUtilities.tsx'),/<TeacherStatusChip\/>/);
});
