const {chromium}=require('playwright');
const assert=require('node:assert/strict');
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto((process.env.AUDIT_URL||'http://127.0.0.1:5175')+'/solo/play/slingshot-archery');
 await page.getByRole('button',{name:'활동 시작',exact:true}).tap();
 await page.getByRole('button',{name:/준비 완료/}).tap();
 const surface=page.locator('.gameplay-content .touch-none');const b=await surface.boundingBox();
 const cdp=await page.context().newCDPSession(page);
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 const primary={id:0,x:b.x+b.width/2,y:b.y+b.height-80};
 const pulled={...primary,y:primary.y+56};
 const secondary={id:1,x:primary.x+40,y:primary.y};
 await touch('touchStart',[primary]);await touch('touchMove',[pulled]);await page.waitForTimeout(40);
 await touch('touchStart',[pulled,secondary]);await touch('touchEnd',[secondary]);await page.waitForTimeout(40);
 assert.match(await page.locator('.gameplay-content').innerText(),/화살\s*5\s*발/,'secondary release must not fire the primary arrow');
 await touch('touchCancel',[]);await page.waitForTimeout(40);
 assert.match(await page.locator('.gameplay-content').innerText(),/화살\s*5\s*발/,'cancel must not fire');
 console.log('PASS slingshot secondary release and cancel');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
