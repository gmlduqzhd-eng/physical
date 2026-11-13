import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const script of ['test-server-hardening.mjs','test-server-hardening-live.mjs','inspect-server-hardening.mjs']){
  test(script+' rejects unsafe targets and never reflects private configuration',()=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'physical-hardening-'));
    const config=path.join(dir,'fixture.local');
    const canary='synthetic-canary-secret-never-send-782162';
    try{
      const cases=[
        {text:'{"dbUrl":"'+canary+'",',expected:/Invalid private fixture configuration/},
        {text:JSON.stringify({dbUrl:canary,apiUrl:canary}),expected:/Invalid private fixture configuration/},
        {text:JSON.stringify({dbUrl:'postgresql://postgres:'+canary+'@production.invalid:54332/postgres',apiUrl:'https://production.invalid:54331',anonKey:canary,environmentMarker:'physical-hardening-native-20261113',runtime:'native'}),expected:/loopback/},
      ];
      for(const input of cases){
        fs.writeFileSync(config,input.text,{mode:0o600});
        const result=spawnSync(process.execPath,[path.join(root,'scripts',script),config,'synthetic-cli-not-executed'],{cwd:root,encoding:'utf8',timeout:10000});
        const output=(result.stdout??'')+(result.stderr??'');
        assert.notEqual(result.status,0);assert.match(output,input.expected);assert.ok(!output.includes(canary));
      }
    }finally{if(fs.existsSync(config))fs.unlinkSync(config);fs.rmdirSync(dir);}
  });
}
