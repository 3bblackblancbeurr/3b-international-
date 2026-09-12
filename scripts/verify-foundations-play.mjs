import {chromium} from 'file:///C:/Users/black/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true}),report=[];
async function open(seed){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(s=>{if(!localStorage.getItem('3b-origins-v1:guest'))localStorage.setItem('3b-origins-v1:guest',JSON.stringify(s));},seed);
 await page.goto('http://127.0.0.1:4173/#monde-3b');await page.getByRole('button',{name:'Reprendre l’aventure',exact:true}).click({timeout:60000});
 await page.evaluate(()=>{window.game=()=>{let f=document.querySelector('.origins');f=f[Object.keys(f).find(k=>k.startsWith('__reactFiber'))];while(f){let h=f.memoizedState;while(h){if(h.memoizedState?.current?.getState)return h.memoizedState.current;h=h.next;}f=f.return;}};});
 return {page,errors};
}
try{
 const {page,errors}=await open({zone:'france',position:{x:-17,z:35},flags:{awakened:true,gardenAccepted:true},avatar:{created:true,name:'Essai atelier',weapon:'zellige'},paris:{materials:4,coins:10,deliveries:2},settings:{quality:'light'}});
 await page.evaluate(()=>game().interact('atelier'));
 await page.getByRole('button',{name:'Restaurer l’atelier · 4 matériaux + 10 pièces',exact:true}).click();
 assert.equal(await page.evaluate(()=>game().getState().paris.workshop),true);
 await page.getByRole('button',{name:'Fermer le dialogue',exact:true}).click();
 await page.getByRole('button',{name:'Garde directionnelle',exact:true}).click();
 await page.getByText('Garde frontale · marche ralentie',{exact:true}).waitFor();
 await page.screenshot({path:'artifacts/refonte/foundations-guard-mobile.png'});
 await page.evaluate(()=>game().navigate('flower'));
 await page.waitForFunction(()=>{const p=game().getState().position;return Math.hypot(p.x+35,p.z+15)<3.1;},{},{timeout:60000});
 await page.evaluate(()=>game().interact('flower'));
 await page.getByRole('button',{name:'Récolter les matériaux du quartier',exact:true}).click();
 assert.equal(await page.evaluate(()=>game().getState().paris.materials),4);
 await page.getByRole('button',{name:'Fermer le dialogue',exact:true}).click();
 await page.evaluate(()=>game().navigate('atelier'));
 await page.waitForFunction(()=>{const p=game().getState().position;return Math.hypot(p.x+17,p.z-33)<3.1;},{},{timeout:60000});
 await page.evaluate(()=>game().interact('atelier'));
 await page.getByRole('button',{name:'Fournir le refuge · 2 matériaux → 5 pièces',exact:true}).click();
 assert.equal(await page.evaluate(()=>game().getState().paris.coins),5);
 await page.screenshot({path:'artifacts/refonte/foundations-delivery-mobile.png'});
 await page.reload();await page.getByRole('button',{name:'Reprendre l’aventure',exact:true}).click({timeout:60000});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('3b-origins-v1:guest')));assert.equal(saved.paris.workshop,true);assert.equal(saved.paris.coins,5);assert.deepEqual(errors,[]);report.push('Mobile: atelier, garde, trajet jardin, récolte, retour, livraison, rechargement');await page.close();
 const scissors=await open({zone:'sanctuary',flags:{awakened:true},avatar:{created:true,name:'Essai ciseaux',weapon:'scissors'},settings:{quality:'light'}});
 await scissors.page.getByRole('button',{name:'Pouvoir du Cercle',exact:true}).click();
 await scissors.page.getByText(/Lames éloignées/).waitFor();assert.equal(await scissors.page.getByRole('button',{name:'Garde directionnelle',exact:true}).isDisabled(),true);
 await scissors.page.screenshot({path:'artifacts/refonte/foundations-scissors-mobile.png'});
 await scissors.page.getByRole('button',{name:'Pouvoir du Cercle',exact:true}).click();await scissors.page.waitForTimeout(500);
 assert.equal(await scissors.page.getByRole('button',{name:'Garde directionnelle',exact:true}).isDisabled(),false);assert.deepEqual(scissors.errors,[]);report.push('Mobile: séparation, parade bloquée, rappel');
}finally{await browser.close();fs.writeFileSync('artifacts/refonte/foundations-play.json',JSON.stringify(report,null,2));}
console.log(report);
