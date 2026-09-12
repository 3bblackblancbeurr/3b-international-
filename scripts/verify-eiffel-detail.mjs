import {chromium} from 'file:///C:/Users/black/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const quality of ['high','light'])for(const [label,z,drag] of [['ensemble',-64,-245],['charpente',-105,-250]]){
 const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],assets=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(/Eiffel.*glb/.test(r.url()))assets.push([r.url(),r.status()]);});
 await p.addInitScript(({quality,z})=>localStorage.setItem('3b-origins-v1:guest',JSON.stringify({zone:'france',position:{x:-75,z},avatar:{created:true,name:'Visite'},flags:{awakened:true},settings:{quality,zoom:8.5}})),{quality,z});
 await p.goto('http://127.0.0.1:4173/#monde-3b');await p.getByRole('button',{name:'Reprendre l’aventure',exact:true}).click({timeout:60000});
 await p.waitForTimeout(1800);await p.mouse.move(900,650);await p.mouse.down();await p.mouse.move(900,650+drag,{steps:16});await p.mouse.up();await p.waitForTimeout(700);
 await p.screenshot({path:`artifacts/refonte/eiffel-${quality}-${label}.png`});assert.deepEqual(errors,[]);assert.ok(assets.some(([url,status])=>status===200&&url.includes(quality==='light'?'Eiffel-lod.glb':'Eiffel.glb')));console.log(quality,label,'OK');await p.close();
}}finally{await browser.close();}
