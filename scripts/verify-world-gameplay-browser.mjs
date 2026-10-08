// Extend the isolated real WorldPage fixture. No player account is contacted.
import fs from 'node:fs/promises';
const original=await fs.readFile(new URL('./verify-hub-master-browser.mjs',import.meta.url),'utf8');
let fixture=original.slice(0,original.indexOf('const report=[];'));
fixture=fixture.replaceAll('5199','5201').replace("const out=process.env.HUB_MASTER_OUT||'artifacts/hub-master-ui';","const out=process.env.GAMEPLAY_OUT||'artifacts/gameplay-ui';");
fixture=fixture.replace('strictPort:true','strictPort:true,watch:{ignored:[\'**/scripts/.*fixture*\',\'**/outputs/**\']}');
fixture=fixture.replace("return code.replace(marker,'window.qa.scene=scene.current;'+marker);", "return code.replace(marker,'window.qa.scene=scene.current;window.qa.audioStatus=()=>audio.current?.status?.();'+marker);");
fixture=fixture.replace(" const marker='return{\\n  refreshHubSchedule:';", " const qaAction=\"onGameplay?.(kind==='strike'?'attack':kind);\";assert.ok(code.includes(qaAction),'Real scene action callback is captured');code=code.replace(qaAction,\"(window.qa.played??=[]).push(kind==='strike'?'attack':kind);\"+qaAction);const marker='return{\\n  refreshHubSchedule:';");
fixture=fixture.replace("args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']", "args:process.env.GAMEPLAY_GPU==='1'?['--no-sandbox']:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']");
fixture=fixture.replace('  qaFreezeCapture(){','  qaPlayState(){return {paused,shot:shot?.kind,presentation,ready:hero?.ready,position,playFrame,keys:[...keys],stick,elapsed,controls,life:lifeInteraction.active,smoother:motionSmoother.value(),speed:stats.speed,hidden:document.hidden,path:{target,points:route.length,planning:routePlanner.status().pending}};},\n  qaFreezeCapture(){');
fixture=fixture.replace("const qaAction=", "const airMarker=\"hero.airAction?.(animation,PLAY_ACTIONS[kind].duration)\";code=code.replace(airMarker,\"(window.qa.airActions??=[]).push(kind),\"+airMarker);const qaAction=");
fixture=fixture.replace('return code.replace(marker,`let qaCaptureFrozen=false;',"code=code.replace('onSnapshot({','onSnapshot(window.qa.snapshot={').replace('  avatar.position.set(position.x,','  if(playFrame.airborne){window.qa.jumpSeen=true;window.qa.jumpPeak=Math.max(window.qa.jumpPeak||0,playFrame.lift);} avatar.position.set(position.x,');return code.replace(marker,`let qaCaptureFrozen=false;");
const cases=String.raw`
const report=[];
// Stop only the private fixture's 3D submissions during static HUD checks.
// SwiftShader can otherwise starve Playwright's two DOM stability frames.
// Native clicks still verify visibility, enabled state and hit targets.
async function staticHud(page,check){
 await page.evaluate(()=>qa.scene.qaFreezeCapture());
 try{return await check();}finally{await page.evaluate(()=>qa.scene.qaResumeCapture());}
}
try{
 for(const device of [{id:'desktop',viewport:{width:1280,height:800}},{id:'touch-landscape',viewport:{width:844,height:390},isMobile:true,hasTouch:true}]){
  const context=await browser.newContext({...device,deviceScaleFactor:1}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('3b-world-quality','fluid');localStorage.setItem('3b-world-hub-orientation',JSON.stringify({seen:true,progress:{}}));});
  console.log(device.id+': load gameplay');await page.goto('http://127.0.0.1:5201/__hub-master-qa',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});
  await page.waitForFunction(()=>window.qa?.scene,{timeout:120000});await page.evaluate(()=>qa.scene.skipCinematic());await page.waitForTimeout(900);
  await staticHud(page,async()=>{
   await page.getByRole('button',{name:'Affichage du jeu',exact:true}).click();
   await page.waitForFunction(()=>qa.audioStatus()?.context==='running');assert.equal(await page.evaluate(()=>qa.audioStatus().closed),false);
   await page.getByRole('button',{name:'Tout masquer',exact:true}).click();
  });
  assert.equal(await page.locator('.world-minimap').count(),0);assert.equal(await page.locator('.hub-mission-rail').count(),0);
  for(const name of ['Sauter','Frapper','Défendre','Esquiver','Pouvoir'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),1);
  await page.getByRole('button',{name:'Sauter',exact:true}).click();
  await page.waitForFunction(()=>qa.jumpSeen);assert.ok(await page.evaluate(()=>qa.jumpPeak>0));
  await page.waitForFunction(()=>qa.snapshot?.gameplay&&!qa.snapshot.gameplay.airborne);assert.equal(await page.evaluate(()=>qa.snapshot.gameplay.lift),0);
  const landAt=await page.evaluate(()=>qa.scene.qaPlayState().elapsed);await page.waitForFunction(at=>qa.scene.qaPlayState().elapsed>at+.3,landAt);
  const air=await page.evaluate(()=>({jump:qa.scene.gameplayAction('jump'),strike:qa.scene.gameplayAction('strike'),gestures:qa.airActions}));assert.equal(air.jump,true);assert.equal(air.strike,true);assert.ok(air.gestures.includes('strike'),'actual actor upper-body action is accepted during Jump');
  await page.waitForFunction(()=>!qa.scene.qaPlayState().playFrame.airborne);
  const before=await page.evaluate(()=>({...qa.snapshot.position}));
  if(device.hasTouch){
   const pad=await page.locator('.world-stick-pad').boundingBox();assert.ok(pad&&pad.width>=90);
   const client=await context.newCDPSession(page),x=pad.x+pad.width*.5,y=pad.y+pad.height*.5;
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-35,id:1}]});
   assert.ok(await page.evaluate(()=>Math.hypot(qa.scene.qaPlayState().stick.x,qa.scene.qaPlayState().stick.z)>.3),'joystick receives the first contact');
   await page.waitForFunction(start=>Math.hypot(qa.scene.qaPlayState().position.x-start.x,qa.scene.qaPlayState().position.z-start.z)>1,before,{timeout:30000});
   const jumps=await page.evaluate(()=>qa.played.filter(kind=>kind==='jump').length);
   const jump=await page.getByRole('button',{name:'Sauter',exact:true}).boundingBox(),jx=jump.x+jump.width/2,jy=jump.y+jump.height/2;
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y-35,id:1},{x:jx,y:jy,id:2}]});
   await page.waitForFunction(count=>qa.played.filter(kind=>kind==='jump').length>count,jumps);
   await page.waitForTimeout(180);
   // Release the action finger, retaining the joystick's captured contact.
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:jx,y:jy,id:2}]});
   assert.ok(await page.evaluate(()=>Math.hypot(qa.scene.qaPlayState().stick.x,qa.scene.qaPlayState().stick.z)>.3),'second finger release preserves joystick');
   await page.waitForFunction(start=>Math.hypot(qa.scene.qaPlayState().position.x-start.x,qa.scene.qaPlayState().position.z-start.z)>1,before,{timeout:30000});
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{await page.locator('.world-canvas').focus();await page.keyboard.down('z');try{await page.waitForFunction(start=>Math.hypot(qa.scene.qaPlayState().position.x-start.x,qa.scene.qaPlayState().position.z-start.z)>1,before,{timeout:30000});}catch(error){console.log('Held move '+JSON.stringify(await page.evaluate(()=>qa.scene.qaPlayState())));throw error;}await page.keyboard.up('z');}
  await page.waitForTimeout(450);const after=await page.evaluate(()=>({...qa.snapshot.position}));console.log(device.id+': motion '+JSON.stringify({before,after}));assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>1,'joystick/keyboard actually moves');
  const stopped={...after};await page.waitForTimeout(450);const still=await page.evaluate(()=>({...qa.snapshot.position}));assert.ok(Math.hypot(still.x-stopped.x,still.z-stopped.z)<.3,'release stops movement');
  await page.evaluate(point=>qa.scene.waypoint({...point,id:'qa-guidance',name:'Repère de parcours'},true),before);await page.waitForFunction(point=>Math.hypot(qa.scene.qaPlayState().position.x-point.x,qa.scene.qaPlayState().position.z-point.z)<1,before,{timeout:45000});await page.evaluate(()=>qa.scene.cancelWaypoint());
  await page.evaluate(()=>{const portal=qa.snapshot.mapItems.find(item=>item.type==='portal');qa.scene.waypoint(portal,true);qa.scene.setMoveInput({x:0,z:0});});await page.waitForTimeout(200);const cancelled=await page.evaluate(()=>qa.scene.qaPlayState().path);assert.equal(cancelled.planning,false);assert.equal(cancelled.target,null);assert.equal(cancelled.points,0);await page.evaluate(()=>qa.scene.cancelWaypoint());
  await page.waitForFunction(()=>!qa.scene.qaPlayState().playFrame.airborne);
  for(const [name,kind] of [['Frapper','attack'],['Défendre','guard'],['Esquiver','dodge'],['Pouvoir','power']]){
   // Real actions must finish before the next native click. Software WebGL can
   // need many wall-clock seconds for these few simulation frames.
   await page.waitForFunction(()=>{const state=qa.scene.qaPlayState();return state.ready&&!state.paused&&!state.hidden&&!state.playFrame.airborne&&!state.playFrame.action;},undefined,{timeout:90000,polling:100});
   console.log(device.id+': action '+kind+' '+JSON.stringify(await page.evaluate(()=>({played:qa.played,state:qa.scene.qaPlayState()}))));const started=await page.evaluate(()=>qa.scene.qaPlayState().elapsed);
   const acceptedBefore=await page.evaluate(action=>qa.played?.filter(value=>value===action).length||0,kind);
   // Freeze the software renderer only for the real native DOM click. On CI,
   // SwiftShader can otherwise starve Playwright's two stable-paint frames.
   await staticHud(page,()=>page.getByRole('button',{name,exact:true}).click());
   await page.waitForFunction(({action,count})=>qa.played?.filter(value=>value===action).length>count,{action:kind,count:acceptedBefore},{polling:100});
   await page.waitForFunction(at=>qa.scene.qaPlayState().elapsed>=at+.8,started,{timeout:90000,polling:100});
  }
  await staticHud(page,async()=>{
   await page.getByRole('button',{name:'Affichage du jeu',exact:true}).focus();await page.keyboard.press('Space');assert.equal(await page.locator('.hud-layout-menu').count(),1,'Space activates the focused UI');
   await page.getByRole('button',{name:'Tout afficher',exact:true}).click();assert.equal(await page.locator('.world-minimap').count(),1);assert.equal(await page.locator('.hub-mission-rail').count(),1);
   await page.getByRole('button',{name:'Fermer la mini-carte',exact:true}).click();await page.getByRole('button',{name:'Masquer les missions',exact:true}).click();
  });
  await capture(page,out+'/'+device.id+'-gameplay.png');
  const metrics=await page.evaluate(()=>({audio:qa.audioStatus(),fps:qa.snapshot.fps,drawCalls:qa.snapshot.drawCalls,crowd:qa.snapshot.graphics?.crowd}));
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});await page.evaluate(()=>qa.scene.skipCinematic());await page.waitForTimeout(500);
  assert.equal(await page.locator('.world-minimap').count(),0);assert.equal(await page.locator('.hub-mission-rail').count(),0);assert.equal(await page.evaluate(()=>qa.audioStatus()?.closed),false);
  assert.deepEqual(errors,[]);report.push({device:device.id,pass:true,checks:['audio gesture after load','actions','jump/land','move/release','worker route physically reaches target','manual input cancels pending route','simultaneous joystick/jump','keyboard UI','widgets close/reopen/persist'],metrics});
  await context.close();
 }
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await server.close();}
`;
const generated=new URL('./.gameplay-fixture.mjs',import.meta.url);
await fs.writeFile(generated,fixture+cases);
try{await import(generated.href);}finally{await fs.unlink(generated).catch(()=>{});}
