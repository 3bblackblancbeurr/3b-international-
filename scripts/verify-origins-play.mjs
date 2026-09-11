const {chromium}=await import(process.env.ORIGINS_PLAYWRIGHT_MODULE||'playwright');
import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir=new URL('../artifacts/origins/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({channel:process.env.ORIGINS_BROWSER_CHANNEL||undefined,headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];let saved;
page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(['warning','error'].includes(m.type()))console.log(m.type(),m.text());});
await page.route('**/rest/v1/arcade_saves**',async r=>{if(r.request().method()==='POST')saved=r.request().postDataJSON().data;await r.fulfill({status:200,contentType:'application/json',body:r.request().method()==='GET'?JSON.stringify(saved?[{data:saved}]:[]):''});});
const shot=async name=>page.screenshot({path:new URL(name+'.png',dir).pathname.replace(/^\/(.:)/,'$1')}),click=async name=>page.getByRole('button',{name,exact:true}).click();
try{
 await page.goto((process.env.ORIGINS_BASE_URL||'http://127.0.0.1:5186/')+'#jeux');await page.locator('.premium-game-card[data-game=tower]').click();await page.getByRole('button',{name:'Entrer dans l’aventure',exact:true}).waitFor({timeout:60000});await shot('new-menu');await click('Entrer dans l’aventure');await click('Commencer');
 // Read engine state from React solely for assertions and navigation. All actions below use keyboard events.
 await page.evaluate(()=>{const el=document.querySelector('.origins-shell');let fiber=el[Object.keys(el).find(k=>k.startsWith('__reactFiber'))];while(fiber){let hook=fiber.memoizedState;while(hook){if(hook.memoizedState?.current?.snapshot&&hook.memoizedState?.current?.runeSequence&&hook.memoizedState?.current?.player){window.qaOrigins=hook.memoizedState.current;return;}hook=hook.next;}fiber=fiber.return;}throw Error('game state not found');});
 async function travel(x,z,{fight=true}={}){await page.evaluate(({x,z,fight})=>new Promise((resolve,reject)=>{let held=new Set(),lastAttack=0,lastPower=0,lastDodge=0,lastParry=0;const start=performance.now();
  const key=(type,k)=>window.dispatchEvent(new KeyboardEvent(type,{key:k,bubbles:true}));
  const stop=()=>{held.forEach(k=>key('keyup',k));held.clear();};
  function loop(now){const g=window.qaOrigins,p=g.player,dx=x-p.x,dz=z-p.z,dist=Math.hypot(dx,dz);if(g.status==='ended'){stop();reject(Error('Died at '+JSON.stringify({x:p.x,z:p.z,hp:p.hp,zone:g.zone})));return;}if(now-start>40000){stop();reject(Error('Travel blocked '+JSON.stringify({x:p.x,z:p.z,target:[x,z],zone:g.zone,hp:p.hp,barriers:g.barriers()})));return;}if(dist<.4){stop();resolve();return;}
   const want=new Set();if(Math.abs(dx)>.2)want.add(dx>0?'a':'d');if(Math.abs(dz)>.2)want.add(dz>0?'w':'s');for(const k of held)if(!want.has(k))key('keyup',k);for(const k of want)if(!held.has(k))key('keydown',k);held=want;
   const near=g.enemies.filter(e=>e.hp>0&&e.zone===g.zone).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];if(fight&&near){const range=Math.hypot(near.x-p.x,near.z-p.z);if(range<3.7&&now-lastAttack>320){key('keydown','j');key('keyup','j');lastAttack=now;}if(range<7&&p.energy>=75&&now-lastPower>1200){key('keydown','r');key('keyup','r');lastPower=now;}if(near.state==='windup'&&near.timer<.16&&now-lastParry>900){key('keydown','f');key('keyup','f');lastParry=now;}}
   requestAnimationFrame(loop);
  }requestAnimationFrame(loop);
 }),{x,z,fight});}
 async function battle(){await page.evaluate(()=>new Promise((resolve,reject)=>{let held=new Set(),lastAttack=0,lastParry=0,lastPower=0,chargeAt=0;const start=performance.now(),key=(type,k)=>window.dispatchEvent(new KeyboardEvent(type,{key:k,bubbles:true}));const stop=()=>held.forEach(k=>key('keyup',k));
  function loop(now){const g=window.qaOrigins,p=g.player,enemies=g.enemies.filter(e=>e.hp>0&&e.zone===g.zone).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));if(!enemies.length){stop();resolve();return;}if(g.status==='ended'||now-start>80000){stop();reject(Error('Battle failed '+JSON.stringify({zone:g.zone,hp:p.hp,enemies:enemies.map(e=>[e.id,e.hp])})));return;}
   const e=enemies[0],dx=e.x-p.x,dz=e.z-p.z,d=Math.hypot(dx,dz),want=new Set();if(d>2){if(Math.abs(dx)>.5)want.add(dx>0?'a':'d');if(Math.abs(dz)>.5)want.add(dz>0?'w':'s');}for(const k of held)if(!want.has(k))key('keyup',k);for(const k of want)if(!held.has(k))key('keydown',k);held=want;
   const danger=enemies.find(e=>e.state==='windup'&&e.timer<.14&&g.inEnemyAttack(e,p));if(danger&&now-lastParry>870){key('keydown','f');key('keyup','f');lastParry=now;}
   if(p.energy>=75&&d<7&&now-lastPower>1000){key('keydown','r');key('keyup','r');lastPower=now;}
   if(d<3.2&&now-lastAttack>330&&(!danger||danger.timer>.2)){key('keydown','j');key('keyup','j');lastAttack=now;}
   requestAnimationFrame(loop);
  }requestAnimationFrame(loop);
 }));}
 const state=()=>page.evaluate(()=>{const g=window.qaOrigins;return{zone:g.zone,hp:g.player.hp,fragments:g.fragments,score:g.score,time:g.time,combo:g.bestCombo,perfects:g.perfects,falls:g.falls};});
 await travel(-5,7);await page.keyboard.press('e');await travel(-7.2,12);await page.keyboard.press('e');await travel(-10,14);await page.keyboard.press('e');await shot('approach-secret');console.log('Approach',await state());
 await travel(0,17);await travel(0,22);await travel(4.8,23);await page.keyboard.press('e');await travel(0,27);await travel(-5,29);await battle();await travel(-5,33);await travel(-5,36);await page.keyboard.press('e');await travel(0,37);await page.keyboard.press('e');await travel(5,37);await page.keyboard.press('e');await shot('passage-runes');console.log('Passage',await state());
 await travel(0,42);await battle();await shot('court-clear');console.log('Court',await state());await travel(0,62);await travel(0,68);await shot('circle');await battle();console.log('Boss',await state());await shot('boss-clear');
 await travel(0,94);await travel(0,106);await shot('gate');await page.keyboard.press('e');await page.waitForTimeout(3500);await shot('gate-opening');await page.locator('.origins-ending').waitFor();await shot('victory');assert.equal(await page.locator('.origins-shell').getAttribute('data-state'),'victory');assert.equal(saved.tower.completed.length,1);assert.deepEqual(errors,[]);console.log('Victory',await state());
 await click('Continuer · niveau 2');await page.locator('.origins-hud').waitFor();await click('Quitter le jeu');assert.equal(await page.locator('.origins-shell').count(),0);assert.equal(await page.locator('#root').evaluate(el=>el.inert),false);await page.reload();await page.locator('.premium-game-card[data-game=tower]').click();await page.locator('.origins-menu').waitFor();assert.ok((await page.locator('.origins-start-note').innerText()).includes('Niveau 2'));console.log('Resume and return passed');fs.writeFileSync(new URL('play-report.json',dir),JSON.stringify({errors,saved,passed:true},null,2));
}catch(e){await shot('play-failure');console.log('failure',e.stack,await page.locator('.origins-shell').innerText(),errors);throw e;}finally{await browser.close();}
