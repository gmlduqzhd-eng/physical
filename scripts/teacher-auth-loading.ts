import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const base=process.argv[2]||'http://127.0.0.1:4173';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Fixture status is local only');
const out=path.resolve('../../outputs/journeys/teacher-authenticated'),browser=await chromium.launch({channel:'chrome',headless:true});fs.mkdirSync(out,{recursive:true});
const cases:unknown[]=[];
try{for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage();let release!:()=>void;const held=new Promise<void>(resolve=>release=resolve);
 await context.route('**/api/teacher?action=status',async route=>{await held;await route.fulfill({json:{authenticated:false,configured:true,localSetup:false}});});
 await page.goto(base+'/teacher/setup');await page.getByText('교사 인증을 확인하고 있어요…',{exact:true}).waitFor();assert.equal(await page.getByLabel('교사 접근 코드',{exact:true}).count(),0);release();await page.getByLabel('교사 접근 코드',{exact:true}).waitFor();cases.push({width,status:'pass',loginFormHiddenUntilDecision:true});await context.close();
 }fs.writeFileSync(path.join(out,'auth-loading-local.json'),JSON.stringify({cases},null,2));console.log('PASS pending teacher authentication, 2 viewports');
}finally{await browser.close();}
