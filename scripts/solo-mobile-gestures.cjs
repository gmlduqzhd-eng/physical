const {chromium}=require('playwright');
const assert=require('node:assert/strict');
async function main(){
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 try{
 for(const game of ['bicycle-pedal-crank','mobility-joint-circle','ribbon-wave-stream']){
  const dimensions=(process.env.GESTURE_VIEWPORT||'390x844').split('x').map(Number);
  const page=await browser.newPage({viewport:{width:dimensions[0],height:dimensions[1]},isMobile:true,hasTouch:true});
  await page.clock.install();
  await page.goto((process.env.AUDIT_URL||'http://127.0.0.1:5175')+'/solo/play/'+game);
  await page.getByRole('button',{name:'활동 시작',exact:true}).tap();
  await page.getByRole('button',{name:/준비 완료/}).tap();
  await page.clock.pauseAt(new Date(Date.now()+100));
  const surface=page.locator('.gameplay-content .touch-none').first();
  await surface.evaluate(el=>el.scrollIntoView({block:'center'}));const b=await surface.boundingBox();
  assert(b.y>=144-1&&b.y+b.height<=dimensions[1]+1,game+': the whole rotation surface must fit below the toolbar');
  const cdp=await page.context().newCDPSession(page);
  const touch=async(type,points)=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});await new Promise(r=>setTimeout(r,5));};
  const point=n=>({id:0,x:b.x+b.width/2+b.width*.35*Math.cos(n*Math.PI/12),y:b.y+b.height/2+b.height*.35*Math.sin(n*Math.PI/12)});
  const secondary={id:1,x:b.x+b.width/2,y:b.y+b.height/2};
  await touch('touchStart',[point(0)]);for(let n=1;n<=6;n++)await touch('touchMove',[point(n)]);
  const progress=async()=>{const text=await page.locator('.gameplay-content').innerText();return Number(text.match(game==='bicycle-pedal-crank'?/(\d+)회전/:game==='mobility-joint-circle'?/(\d+)%/:/(\d+\.\d+) \/ 3/)?.[1]);};
  const before=await progress();
  await touch('touchStart',[point(6),secondary]);await touch('touchEnd',[secondary]);
  for(let n=7;n<=32;n++)await touch('touchMove',[point(n)]);
  const after=await progress();assert(after>before,game+': lifting a second finger must not interrupt rotation');
  await touch('touchCancel',[]);const canceled=await progress();
  await surface.dispatchEvent('pointermove',{pointerId:99,isPrimary:true,clientX:b.x,clientY:b.y});
  assert.equal(await progress(),canceled,game+': canceled rotation stays stopped');
  console.log('PASS '+game+' secondary release, cancel');await page.close();
 }
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
