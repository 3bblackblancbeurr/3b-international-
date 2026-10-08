// Real WebAudio output, gesture unlock and mute/resume. No microphone,
// speaker recording, remote generation or player account is involved.
import {createServer} from 'vite';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=resolve(process.env.AUDIO_OUT||'outputs/world-audio'),fixture=resolve('scripts/.world-audio-fixture.html');
await mkdir(out,{recursive:true});let server,browser;const errors=[];
const html=`<!doctype html><meta charset="utf-8"><button id="unlock">Écouter</button><script type="module">
import {createWorldAudio} from '/src/world/audio.js';
const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);window.testContext=this;window.output=this.createAnalyser();output.fftSize=2048;}};
const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(target,...args){const result=connect.call(this,target,...args);if(target===window.testContext?.destination)connect.call(this,window.output);return result;};
window.audio=createWorldAudio();audio.enable(true,'france');
document.querySelector('#unlock').addEventListener('pointerdown',()=>audio.enable(true));
window.measure=async()=>{let peak=0,sum=0,count=0;const samples=new Float32Array(output.fftSize);for(let n=0;n<12;n++){output.getFloatTimeDomainData(samples);for(const value of samples){peak=Math.max(peak,Math.abs(value));sum+=value*value;count++;}await new Promise(resolve=>setTimeout(resolve,50));}return{peak,rms:Math.sqrt(sum/count)};};window.audioReady=true;
</script>`;
try{
 await writeFile(fixture,html);server=await createServer({server:{host:'127.0.0.1',port:5334,strictPort:true},logLevel:'error'});await server.listen();
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=document-user-activation-required']});
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:5334/scripts/.world-audio-fixture.html');await page.waitForFunction(()=>window.audioReady);
 const before=await page.evaluate(()=>audio.status());assert.equal(before.context,'suspended');assert.equal(before.needsGesture,true);
 await page.getByRole('button',{name:'Écouter'}).tap();await page.waitForFunction(()=>audio.status().context==='running'&&audio.status().score.step>0);await page.waitForTimeout(500);
 const active=await page.evaluate(async()=>({status:audio.status(),output:await measure()}));assert.ok(active.output.rms>.00005&&active.output.peak<.95,'audible output after a real touch gesture');
 const regions=[];for(const region of ['france','italie','estonie','turquie','algerie','tunisie','maroc','espagne']){
  await page.evaluate(region=>{audio.ambience(region);audio.state('guardian');audio.weapon('rapier');audio.event('battle','strike');},region);await page.waitForTimeout(300);
  const row=await page.evaluate(async()=>({status:audio.status(),output:await measure()}));assert.equal(row.status.score.region,region);assert.ok(row.output.rms>.00005&&row.output.peak<.95);assert.ok(row.status.score.voices<=32);regions.push({region,...row});
 }
 await page.evaluate(()=>audio.setMix({master:0}));await page.waitForTimeout(1000);const sliderMuted=await page.evaluate(()=>measure());assert.ok(sliderMuted.peak<.00001,'master slider silences the actual rendered mix');
 await page.evaluate(()=>{audio.setMix({master:.78});audio.gameplay('power');audio.enable(false);});await page.waitForFunction(()=>audio.status().context==='suspended');
 const muted=await page.evaluate(async()=>{const start=testContext.currentTime;await new Promise(resolve=>setTimeout(resolve,250));return{status:audio.status(),start,end:testContext.currentTime,canPlay:audio.gameplay('power')};});assert.equal(muted.start,muted.end);assert.equal(muted.status.score.voices,0);assert.equal(muted.canPlay,false);
 await page.getByRole('button',{name:'Écouter'}).tap();await page.waitForFunction(()=>audio.status().context==='running'&&audio.status().score.step>0);await page.waitForTimeout(500);const resumed=await page.evaluate(async()=>({status:audio.status(),output:await measure()}));assert.ok(resumed.output.rms>.00005);
 await page.evaluate(()=>audio.visibility(true));await page.waitForFunction(()=>audio.status().context==='suspended');const hidden=await page.evaluate(()=>audio.status());assert.equal(hidden.score.voices,0);assert.equal(hidden.ambientLoops,0);
 await page.evaluate(()=>audio.visibility(false));await page.getByRole('button',{name:'Écouter'}).tap();await page.waitForFunction(()=>audio.status().context==='running');await page.waitForTimeout(500);const visible=await page.evaluate(()=>measure());assert.ok(visible.rms>.00005);
 await page.evaluate(()=>audio.close());await page.waitForFunction(()=>testContext.state==='closed');const closed=await page.evaluate(()=>audio.status());assert.equal(closed.closed,true);assert.equal(closed.score.voices,0);assert.equal(closed.ambientLoops,0);assert.deepEqual(errors,[]);
 const report={ok:true,mode:'Chromium real AudioContext and analyser output; trusted touch, slider mute, suspend/resume and cleanup. Physical speakers/phones are not measured.',before,active,regions,sliderMuted,muted,resumed,hidden,visible,closed,errors};await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log('WORLD_AUDIO_OK '+JSON.stringify({regions:regions.length,before:before.context,active:active.output,sliderMuted,resumed:resumed.output,closed:closed.context}));
}finally{await browser?.close();await server?.close();await unlink(fixture).catch(()=>{});}
