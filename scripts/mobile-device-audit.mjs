import { chromium, webkit, devices } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.AUDIT_URL || 'http://127.0.0.1:5210';
const out = process.env.AUDIT_OUTPUT || 'test-results/mobile-device';
fs.mkdirSync(out, {recursive:true});
const results = [];
for (const engine of [chromium, webkit].filter(engine=>!process.env.MOBILE_ENGINE || engine.name()===process.env.MOBILE_ENGINE)) {
  const browser = await engine.launch({...engine === chromium ? {channel:'chrome'} : {}, headless:true});
  try {
    for (const [width,height] of [[320,568],[360,800],[390,844],[430,932],[667,375],[844,390]]) {
      const context = await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,
        userAgent:devices[engine === chromium ? 'Pixel 7' : 'iPhone 13'].userAgent});
      try {
        await context.addInitScript(() => {
          localStorage.setItem('physical_background_music_v1','off');
          Object.defineProperty(navigator,'share',{value:undefined,configurable:true});
          Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}},configurable:true});
        });
        const page = await context.newPage(), errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        const checkLayout = async () => assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${engine.name()} ${width} horizontal overflow: ${page.url()}`);
        for (const route of ['/','/hub']) {
          await page.goto(base+route,{waitUntil:'domcontentloaded'});
          const slider = page.getByRole('slider',{name:'배경음악 볼륨'});
          await slider.waitFor();
          await checkLayout();
          await page.getByRole('button',{name:'접속 QR 크게 보기'}).tap();
          const qr = page.getByRole('dialog');
          await qr.waitFor();
          const rect = await qr.boundingBox();
          assert(rect.x>=-1 && rect.y>=-1 && rect.x+rect.width<=width+2 && rect.y+rect.height<=height+2,'QR must fit viewport');
          await page.getByRole('button',{name:'QR 확대 닫기'}).tap();
          await qr.waitFor({state:'hidden'});
          await page.getByRole('button',{name:'링크 공유',exact:true}).tap();
          await page.getByRole('status').filter({hasText:/복사/}).waitFor();
          const feedback = page.getByRole('status').filter({hasText:/복사/});
          assert.equal(await feedback.evaluate(el=>getComputedStyle(el).position),'fixed','Mobile share feedback stays at the viewport bottom');
          const feedbackBox = await feedback.boundingBox();
          assert(feedbackBox.y+feedbackBox.height<=height && feedbackBox.y+feedbackBox.height>=height-50,'Share feedback does not cover header controls');
          await checkLayout();
          const box = await slider.boundingBox();
          await slider.tap({position:{x:box.width*.7,y:box.height/2}});
          const changed = await slider.inputValue();
          await page.reload({waitUntil:'domcontentloaded'});
          await slider.waitFor();
          assert.equal(await slider.inputValue(),changed);
          await page.getByRole('button',{name:'배경음악 켜기'}).tap();
          await page.getByRole('button',{name:'배경음악 끄기'}).tap();
          await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('blocked');}},configurable:true}));
          await page.getByRole('button',{name:'링크 공유',exact:true}).tap();
          const manualLink=page.getByRole('textbox',{name:'공유할 링크'});
          await manualLink.tap();
          const selection = await manualLink.evaluate(input=>({start:input.selectionStart,end:input.selectionEnd,length:input.value.length,focused:document.activeElement===input}));
          assert(selection.start===0&&selection.end===selection.length,`Manual copy remains touch accessible: ${JSON.stringify(selection)}`);
          await page.getByRole('button',{name:'공유 안내 닫기'}).tap();
          assert.equal(await manualLink.count(),0);
          await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}},configurable:true}));
          await page.getByRole('button',{name:'링크 공유',exact:true}).tap();
          if (route==='/hub') {
            await page.getByRole('button',{name:'메뉴',exact:true}).tap();
            await page.getByRole('dialog',{name:'허브 메뉴'}).waitFor();
            await page.keyboard.press('Escape');
            for (const name of ['⚡ 특별 활동','🧑‍🏫 선생님 도구','🏆 내 기록','🎮 게임 찾기']) {
              await page.getByRole('button',{name,exact:true}).tap();
              await checkLayout();
            }
            await page.getByRole('searchbox',{name:'게임 검색'}).fill('스탑워치');
            assert.equal(await page.locator('[data-game-card]').count(),1);
          }
          await page.screenshot({path:`${out}/${engine.name()}-${width}-${route==='/'?'main':'hub'}.png`});
        }
        for (const route of ['/lobby','/manual','/play/stopwatch']) {
          await page.goto(base+route,{waitUntil:'domcontentloaded'});
          if (route.includes('/play')) await page.getByRole('button',{name:/활동 시작/}).waitFor();
          else await page.locator('h1').first().waitFor();
          await checkLayout();
        }
        assert.deepEqual(errors,[]);
        results.push({engine:engine.name(),width,height,passed:true});
        console.log(`PASS ${engine.name()} ${width}x${height}`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); fs.writeFileSync(`${out}/results.json`,JSON.stringify({base,results},null,2)); }
}
