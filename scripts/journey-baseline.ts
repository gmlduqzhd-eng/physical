import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {mergedMovementMeta} from '../src/domain/mergedMovementVariants';
const base=process.argv[2]||'https://physical-pi.vercel.app',out=path.resolve('../../outputs/journeys/baseline');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),report:{base:string;cases:unknown[];errors:string[]}={base,cases:[],errors:[]};
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
 for(const route of ['/','/solo','/hub','/teacher','/teacher/setup','/lobby','/demo']){await page.goto(base+route);await page.locator('h1,h2').first().waitFor();report.cases.push({width,route,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),title:await page.locator('h1,h2').first().innerText()});}
 await page.goto(base+'/solo');const search=page.getByRole('searchbox');await search.fill('  신호등  ');report.cases.push({width,check:'trimmed search',cards:await page.locator('[data-game-card]').count()});
 const variant=mergedMovementMeta('tilt_balance')!;await search.fill(variant.name);report.cases.push({width,check:'current course name search',name:variant.name,cards:await page.locator('[data-game-card]').count()});
 await page.evaluate(()=>sessionStorage.setItem('physical_player_profile',JSON.stringify({nickname:'흐름검증',totalScore:300,totalPlays:1,highScores:{zigzag:300},playCounts:{zigzag:1},recentGames:[{gameType:'zigzag',gameName:'갈림길 보급 작전',score:300,playedAt:Date.now(),rpe:3,details:{metrics:{'완료 작전':'3 / 3'}}}],createdAt:Date.now()})));
 await page.goto(base+'/hub/tools');await page.getByRole('button',{name:'🏆 내 기록',exact:true}).click();report.cases.push({width,check:'recent results rendered',recent:await page.getByText('갈림길 보급 작전',{exact:true}).count(),rpe:await page.getByText(/자각도|RPE/).count()});await page.screenshot({path:path.join(out,'records-'+width+'.png'),fullPage:true});
 await page.close();}
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
