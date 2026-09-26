import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 H24_CHANNELS,SPORT_FINALS,SPORT_PLAYER_SHELL_URL,isTrustedSportEmbed,
 isTrustedSportShellOrigin,mediaSources,sportPlayerShellUrl
} from '../src/sport/media-catalog.js';

const page=fs.readFileSync(new URL('../src/sport/SportPage.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/sport/sport.css',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../public/sport-player-shell.html',import.meta.url),'utf8');
const shellJs=fs.readFileSync(new URL('../public/sport-player-shell.js',import.meta.url),'utf8');
const vercel=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const liveApi=fs.readFileSync(new URL('../api/sport-live.js',import.meta.url),'utf8');

test('Sport keeps H24 and Finals as protected top-level sections',()=>{
 assert.match(page,/id:'h24'/);
 assert.match(page,/id:'finals'/);
 assert.match(page,/useState\('h24'\)/);
 assert.match(page,/SportMediaPlayer/);
});

test('H24 profiles are live-only and never contain historical replay sources',()=>{
 assert.ok(H24_CHANNELS.length>=6);
 for(const channel of H24_CHANNELS){
  assert.equal(channel.badge,'H24');
  assert.match(channel.liveProfile,/^h24-/);
  assert.deepEqual(mediaSources(channel),[]);
 }
 assert.match(page,/fetch\('\/api\/sport-live'/);
 assert.match(page,/source\?\.mode==='live'/);
 assert.match(page,/Aucun replay ni ancienne finale ne peut entrer dans H24/);
});

test('live discovery requires a real ongoing embeddable sports broadcast with bounded search quota',()=>{
 assert.match(liveApi,/eventType:'live'/);
 assert.match(liveApi,/videoEmbeddable:'true'/);
 assert.match(liveApi,/videoSyndicated:'true'/);
 assert.match(liveApi,/videoCategoryId:'17'/);
 assert.match(liveApi,/maxResults:'50'/);
 assert.match(liveApi,/order:'viewCount'/);
 assert.match(liveApi,/liveBroadcastContent==='live'/);
 assert.match(liveApi,/status\?\.embeddable===true/);
 assert.match(liveApi,/actualStartTime/);
 assert.match(liveApi,/actualEndTime/);
 assert.match(liveApi,/mode:'live'/);
 assert.match(liveApi,/YOUTUBE_API_KEY/);
 assert.match(liveApi,/s-maxage=1200/);
 assert.match(liveApi,/single-global-live-search/);
 assert.doesNotMatch(liveApi,/PROFILE_QUERIES|GF-WteOINCc|nELaL14ms7A|Pbyn08kfhXY/);
});

test('Finals keep full official matches and official fallback where available',()=>{
 assert.ok(SPORT_FINALS.length>=18);
 for(const final of SPORT_FINALS){
  const sources=mediaSources(final);
  assert.ok(sources.length>=1);
  assert.equal(sources[0].mode,'full');
  for(const source of sources)assert.equal(isTrustedSportEmbed(source.embedUrl),true);
 }
 const resilient=SPORT_FINALS.filter(final=>mediaSources(final).some(source=>source.mode==='fallback'));
 assert.ok(resilient.length>=4);
});

test('1998 France World Cup final is available as a resilient official FIFA archive',()=>{
 const final1998=SPORT_FINALS.find(final=>final.id==='final-foot-1998');
 assert.ok(final1998);
 assert.equal(final1998.sport,'Football');
 assert.equal(final1998.year,'1998');
 assert.match(final1998.title,/France/);
 const sources=mediaSources(final1998);
 assert.equal(sources.length,2);
 assert.ok(sources.every(source=>source.provider==='FIFA'&&source.mode==='full'));
});

test('Finals cover a broad official multisport archive',()=>{
 const sports=new Set(SPORT_FINALS.map(final=>final.sport));
 assert.ok(sports.size>=9);
 for(const required of ['Football','Rugby','Basket','Volley','Badminton','Beach-volley','Tennis de table','Tir à l’arc','Hockey sur glace']){
  assert.ok(sports.has(required),'missing '+required);
 }
 assert.ok(SPORT_FINALS.filter(final=>final.sport==='Football').length>=5);
 assert.ok(SPORT_FINALS.filter(final=>final.sport==='Badminton').length>=2);
 assert.ok(SPORT_FINALS.filter(final=>final.sport==='Beach-volley').length>=2);
});

test('H24 sport tabs filter one shared verified live pool instead of multiplying searches',()=>{
 assert.match(page,/const allLiveSources=livePools\.global\|\|\[\]/);
 assert.match(page,/allLiveSources\.filter\(source=>source\.sport===profileSport\)/);
 assert.doesNotMatch(page,/api\/sport-live\?profile=/);
 assert.match(page,/\[section,liveReload\]/);
});

test('Finals can be filtered by sport without touching H24',()=>{
 assert.match(page,/const\[finalSport,setFinalSport\]=useState\('Tous'\)/);
 assert.match(page,/SPORT_FINALS\.filter\(item=>item\.sport===finalSport\)/);
 assert.match(page,/Filtrer les finales par sport/);
});

test('playback is routed through the HTTPS 3B shell instead of direct YouTube in the app',()=>{
 assert.equal(SPORT_PLAYER_SHELL_URL,'https://3b-international.vercel.app/sport-player-shell.html');
 assert.equal(isTrustedSportShellOrigin('https://3b-international.vercel.app'),true);
 assert.equal(isTrustedSportShellOrigin('https://evil.example'),false);
 const sample=mediaSources(SPORT_FINALS[0])[0];
 const url=new URL(sportPlayerShellUrl(sample,{autoplay:true,muted:true,start:123,token:'abcdefgh1234'}));
 assert.equal(url.origin,'https://3b-international.vercel.app');
 assert.equal(url.pathname,'/sport-player-shell.html');
 assert.equal(url.searchParams.get('video'),sample.videoId);
 assert.equal(url.searchParams.get('start'),'123');
 assert.match(page,/sportPlayerShellUrl\(source/);
 assert.doesNotMatch(page,/src=\{source\.embedUrl\}/);
});

test('player adapts to weak networks, background state and resumes position',()=>{
 assert.match(page,/navigator\.connection/);
 assert.match(page,/effectiveType==='3g'/);
 assert.match(page,/connection\.saveData/);
 assert.match(page,/visibilitychange/);
 assert.match(page,/3b-sport-resume:/);
 assert.match(page,/sessionStorage\.setItem\(resumeKey/);
 assert.match(page,/Connexion retrouvée · reprise automatique/);
 assert.match(page,/Buffer trop long · réparation automatique/);
});

test('player classifies YouTube failures and avoids repeated dead sources',()=>{
 assert.match(page,/\[2,100,101,150\]/);
 assert.match(page,/code===5\|\|code===153/);
 assert.match(page,/3b-sport-block:/);
 assert.match(page,/SPORT_PERMANENT_COOLDOWN/);
 assert.match(page,/Chargement trop long · secours automatique/);
});

test('the bridge shell is isolated, tokenized and cannot pop out of 3B',()=>{
 assert.match(shell,/sport-player-shell\.js/);
 assert.match(shell,/sandbox="allow-scripts allow-same-origin allow-presentation"/);
 assert.match(shell,/allow="autoplay; encrypted-media"/);
 assert.doesNotMatch(shell,/allow-popups/);
 assert.doesNotMatch(shell,/allow-top-navigation/);
 assert.doesNotMatch(shell,/picture-in-picture/);
 assert.match(shellJs,/VIDEO_RE/);
 assert.match(shellJs,/TOKEN_RE/);
 assert.match(shellJs,/www\.youtube-nocookie\.com\/embed/);
 assert.match(shellJs,/url\.searchParams\.set\('origin',location\.origin\)/);
 assert.match(shellJs,/url\.searchParams\.set\('fs','0'\)/);
 assert.match(shellJs,/parent\.postMessage/);
 assert.doesNotMatch(shellJs,/window\.open/);
});

test('messages from the bridge require the trusted 3B origin and per-player token',()=>{
 assert.match(page,/event\.source!==iframeRef\.current\?\.contentWindow/);
 assert.match(page,/isTrustedSportShellOrigin\(event\.origin\)/);
 assert.match(page,/data\.token!==playerToken/);
 assert.match(shellJs,/data\.token!==token/);
});

test('health status stays outside the third-party video surface',()=>{
 assert.match(css,/sport-media-details/);
 assert.match(css,/sport-media-health\{position:static/);
 assert.match(page,/sport-media-details/);
});

test('Vercel sends YouTube-compatible referrer identity and isolates direct framing',()=>{
 const generic=vercel.headers.find(entry=>entry.source.includes('sport-player-shell'));
 const shellHeaders=vercel.headers.find(entry=>entry.source==='/sport-player-shell.html');
 assert.ok(generic);
 assert.ok(shellHeaders);
 const genericMap=Object.fromEntries(generic.headers.map(h=>[h.key,h.value]));
 const shellMap=Object.fromEntries(shellHeaders.headers.map(h=>[h.key,h.value]));
 assert.equal(genericMap['Referrer-Policy'],'strict-origin-when-cross-origin');
 assert.match(genericMap['Content-Security-Policy'],/frame-src 'self' https:\/\/challenges\.cloudflare\.com;/);
 assert.doesNotMatch(genericMap['Content-Security-Policy'],/youtube-nocookie/);
 assert.equal(shellMap['Referrer-Policy'],'strict-origin-when-cross-origin');
 assert.match(shellMap['Content-Security-Policy'],/frame-src https:\/\/www\.youtube-nocookie\.com;/);
 assert.match(shellMap['Content-Security-Policy'],/frame-ancestors 'self' https:\/\/localhost capacitor:/);
});
