import {spawnSync} from 'node:child_process';

// Run inside the hosting build itself: a failed check prevents a READY deployment.
// Test processes never inherit production AI keys, account secrets or DB credentials.
const target=process.argv[2];
if(!['main','studio'].includes(target))throw Error('Choose main or studio');
const npm=process.env.npm_execpath;
if(!npm)throw Error('Run through npm run verify:deploy or verify:studio-deploy');
const testEnv=Object.fromEntries(Object.entries(process.env).filter(([key])=>
  !/^(OPENAI_|GEMINI_|TEACHER_|CLASSROOM_|STUDIO_|SUPABASE_|VITE_SUPABASE_|LOCAL_TEACHER_)/.test(key)));
testEnv.NODE_ENV='test';
const checks=target==='main'
  ? ['lint','test:ui','test:deploy-gate','check:server:node','test','test:teacher','test:studio','test:studio:deployment','test:flagship','test:workshop','test:flagship:devices','test:camera','test:operations','test:regression','test:classroom-refresh']
  : ['check:server:node','test:studio'];
for(const command of [...checks,...(target==='main'?['build','build:studio']:['build:studio'])]){
  const build=command==='build'||command==='build:studio';
  const result=spawnSync(process.execPath,[npm,'run',command],{stdio:'inherit',env:build?process.env:testEnv});
  if(result.error||result.status!==0){console.error('Deployment blocked by failed check:',command);process.exit(result.status||1);}
}
