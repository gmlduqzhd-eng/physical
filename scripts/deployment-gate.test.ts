import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

test('a failed deployment check stops before building and receives no production secrets',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'physical-gate-'));
 try{
  const shim=join(dir,'npm.cjs'),record=join(dir,'calls.txt');
  await writeFile(shim,"const fs=require('node:fs');if(process.env.GEMINI_API_KEY||process.env.CLASSROOM_TEACHER_BOOTSTRAP||process.env.SUPABASE_SECRET_KEY)process.exit(98);fs.appendFileSync(process.env.GATE_TEST_RECORD,process.argv[3]+'\\n');process.exit(17);");
  const result=spawnSync(process.execPath,[resolve('scripts/verify-deploy.mjs'),'main'],{encoding:'utf8',env:{...process.env,npm_execpath:shim,GATE_TEST_RECORD:record,GEMINI_API_KEY:'synthetic-provider-secret',CLASSROOM_TEACHER_BOOTSTRAP:'synthetic-bootstrap-secret',SUPABASE_SECRET_KEY:'synthetic-database-secret'}});
  assert.equal(result.status,17);assert.equal(await readFile(record,'utf8'),'lint\n');assert.match(result.stderr,/Deployment blocked/);
  assert(!result.stderr.includes('synthetic-provider-secret'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('unknown deployment targets fail before any commands can run',()=>{
 const result=spawnSync(process.execPath,[resolve('scripts/verify-deploy.mjs'),'unknown'],{encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/Choose main or studio/);
});
